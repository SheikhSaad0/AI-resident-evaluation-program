// pages/api/evaluations/[id].ts

import { NextApiRequest, NextApiResponse } from 'next';
import { getPrismaClient } from '../../../lib/prisma';
import { generateV4ReadSignedUrl, downloadFileAsBuffer } from '../../../lib/r2';

import ffmpeg from 'fluent-ffmpeg';
import ffprobeStatic from 'ffprobe-static';
import fs from 'fs';
import os from 'os';
import path from 'path';

// Tell fluent-ffmpeg where to find the ffprobe binary
ffmpeg.setFfprobePath(ffprobeStatic.path);

// Helper function to parse HH:mm:ss.ss to seconds
const parseTimemarkToSeconds = (timemark: string): number => {
    const parts = timemark.split(':');
    const seconds = parseFloat(parts.pop() || '0');
    const minutes = parseInt(parts.pop() || '0', 10);
    const hours = parseInt(parts.pop() || '0', 10);
    return (hours * 3600) + (minutes * 60) + seconds;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { id } = req.query;
    const prisma = getPrismaClient(req);

    if (!id || typeof id !== 'string') {
        return res.status(400).json({ message: 'A valid evaluation ID is required.' });
    }

    if (req.method === 'GET') {
        try {
            const job = await prisma.job.findUnique({
                where: { id },
                include: { resident: true, attending: true, programDirector: true }
            });

            if (!job) {
                return res.status(404).json({ message: 'Evaluation not found.' });
            }

            let audioDuration = job.audioDuration;
            let readableUrl = null;

            if ((audioDuration === null || audioDuration === undefined) && job.gcsObjectPath) {
                console.log(`[API FINAL] Starting DURATION SCAN for job ${id}`);
                const tempFilePath = path.join(os.tmpdir(), `temp_audio_${id}.webm`);

                try {
                    const fileContents = await downloadFileAsBuffer(job.gcsObjectPath);
                    fs.writeFileSync(tempFilePath, fileContents);

                    audioDuration = await new Promise<number | null>((resolve, reject) => {
                        let lastTimemark = '00:00:00.00';

                        ffmpeg(tempFilePath)
                            .on('progress', (progress) => {
                                // Keep updating the last known timemark
                                lastTimemark = progress.timemark;
                            })
                            .on('error', (err) => {
                                console.error(`[API FINAL] FFmpeg processing error for job ${id}:`, err.message);
                                reject(err);
                            })
                            .on('end', () => {
                                console.log(`[API FINAL] FFmpeg scan finished. Last timemark: ${lastTimemark}`);
                                const durationInSeconds = parseTimemarkToSeconds(lastTimemark);
                                resolve(Math.ceil(durationInSeconds));
                            })
                            // Process the file but send the output to null, as we only need the time
                            .output('/dev/null')
                            .format('null')
                            .run();
                    });

                    if (audioDuration && audioDuration > 0) {
                        console.log(`[API FINAL] SUCCESS! Duration found: ${audioDuration}s. Updating database.`);
                        await prisma.job.update({ where: { id }, data: { audioDuration: audioDuration } });
                    } else {
                        console.error(`[API FINAL] FAILURE: Scan completed but duration was zero or null for job ${id}.`);
                    }

                } catch (metaError) {
                    console.error(`[API FINAL] A critical error occurred in the try/catch block for job ${id}:`, metaError);
                } finally {
                    if (fs.existsSync(tempFilePath)) {
                        fs.unlinkSync(tempFilePath);
                    }
                }
            }

            if (job.gcsObjectPath) {
                readableUrl = await generateV4ReadSignedUrl(job.gcsObjectPath);
            }

            res.status(200).json({ ...job, readableUrl, audioDuration });

        } catch (error) {
            console.error(`[Evaluation GET] Top-level error for job ${id}:`, error);
            res.status(500).json({ message: 'An error occurred while fetching the evaluation.' });
        }
        return;
    }
    
    // ... (Your PUT and DELETE methods)


    
    if (req.method === 'PUT') {
        try {
            const { updatedEvaluation, attendingId, attendingType } = req.body;
            const dataToUpdate: {
                result?: any;
                status?: string;
                attendingId?: string | null;
                programDirectorId?: string | null;
            } = {};

            if (updatedEvaluation) {
                dataToUpdate.result = updatedEvaluation;
                if (typeof updatedEvaluation.isFinalized !== 'undefined') {
                    dataToUpdate.status = updatedEvaluation.isFinalized ? 'complete' : 'draft';
                }
            }
            
            if (typeof attendingId !== 'undefined') {
                if (attendingType === 'Program Director') {
                    dataToUpdate.programDirectorId = attendingId;
                    dataToUpdate.attendingId = null; 
                } else { 
                    dataToUpdate.attendingId = attendingId;
                    dataToUpdate.programDirectorId = null; 
                }
            }

            if (Object.keys(dataToUpdate).length === 0) {
                return res.status(400).json({ message: 'No update data provided.' });
            }

            const updatedJob = await prisma.job.update({ where: { id }, data: dataToUpdate });
            res.status(200).json(updatedJob);
        } catch (error) {
            res.status(500).json({ message: 'An error occurred while updating the evaluation.' });
        }
        return;
    }

    if (req.method === 'DELETE') {
        try {
            await prisma.job.delete({ where: { id } });
            res.status(204).end();
        } catch (error) {
            res.status(500).json({ message: 'Failed to delete evaluation.' });
        }
        return;
    }

    res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
}