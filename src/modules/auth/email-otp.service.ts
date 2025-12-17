import nodemailer from 'nodemailer';
import { getOtpEmailTemplate } from './email-templates';
import { doc, setDoc, getDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface IEmailOtpService {
    sendOtp(email: string): Promise<string>;
    verifyOtp(email: string, code: string): Promise<boolean>;
}

// OTP document structure in Firestore
interface OtpDocument {
    code: string;
    email: string;
    expiresAt: Timestamp;
    createdAt: Timestamp;
}

export class EmailOtpService implements IEmailOtpService {
    private transporter: nodemailer.Transporter | null = null;
    private isReady = false;

    constructor() {
        this.initializeTransporter();
    }

    private async initializeTransporter() {
        if (process.env.SMTP_HOST && process.env.SMTP_USER) {
            // Real SMTP Configuration (Gmail with App Password)
            this.transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: Number(process.env.SMTP_PORT) || 587,
                secure: process.env.SMTP_SECURE === 'true',
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASSWORD,
                },
            });
            this.isReady = true;
            console.log('[EmailOtpService] Configured with real SMTP settings.');
        } else {
            // Test Mode: Ethereal Email
            try {
                console.log('[EmailOtpService] No SMTP config found. Generating Ethereal test account...');
                const testAccount = await nodemailer.createTestAccount();

                this.transporter = nodemailer.createTransport({
                    host: 'smtp.ethereal.email',
                    port: 587,
                    secure: false,
                    auth: {
                        user: testAccount.user,
                        pass: testAccount.pass,
                    },
                });
                this.isReady = true;
                console.log('[EmailOtpService] Ethereal test account ready.');
            } catch (err) {
                console.error('[EmailOtpService] Failed to create Ethereal account:', err);
            }
        }
    }

    private getOtpDocId(email: string): string {
        // Create a safe document ID from email
        return `otp_${email.replace(/[^a-zA-Z0-9]/g, '_')}`;
    }

    async sendOtp(email: string): Promise<string> {
        if (!this.isReady && !this.transporter) {
            await this.initializeTransporter();
            if (!this.transporter) {
                console.error('[EmailOtpService] Transporter not ready.');
                const otp = Math.floor(100000 + Math.random() * 900000).toString();
                // Still store in Firestore for verification to work
                await this.storeOtp(email, otp);
                console.log(`[EmailOtpService] FALLBACK OTP for ${email}: ${otp}`);
                return otp;
            }
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Store OTP in Firestore instead of in-memory
        await this.storeOtp(email, otp);

        console.log(`[EmailOtpService] Generated OTP for ${email}: ${otp}`);

        const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'noreply@pinmboworld.com';

        try {
            const info = await this.transporter!.sendMail({
                from: `"Pinmbo World" <${fromEmail}>`,
                to: email,
                subject: '✨ Your Magic Verification Code',
                text: `Your verification code is: ${otp}`,
                html: getOtpEmailTemplate(otp)
            });

            console.log(`[EmailOtpService] Email sent: ${info.messageId}`);

            const previewUrl = nodemailer.getTestMessageUrl(info);
            if (previewUrl) {
                console.log(`[EmailOtpService] PREVIEW: ${previewUrl}`);
            }
        } catch (error) {
            console.error('[EmailOtpService] Failed to send email:', error);
        }

        return otp;
    }

    private async storeOtp(email: string, code: string): Promise<void> {
        const docId = this.getOtpDocId(email);
        const expiresAt = Timestamp.fromDate(new Date(Date.now() + 10 * 60 * 1000)); // 10 minutes

        const otpDoc: OtpDocument = {
            code,
            email,
            expiresAt,
            createdAt: Timestamp.now(),
        };

        await setDoc(doc(db, 'email_otps', docId), otpDoc);
        console.log(`[EmailOtpService] OTP stored in Firestore for ${email}`);
    }

    async verifyOtp(email: string, code: string): Promise<boolean> {
        const docId = this.getOtpDocId(email);

        try {
            const otpDoc = await getDoc(doc(db, 'email_otps', docId));

            if (!otpDoc.exists()) {
                console.log(`[EmailOtpService] No OTP found for ${email}`);
                return false;
            }

            const data = otpDoc.data() as OtpDocument;

            // Check if expired
            if (data.expiresAt.toDate() < new Date()) {
                console.log(`[EmailOtpService] OTP expired for ${email}`);
                await deleteDoc(doc(db, 'email_otps', docId));
                return false;
            }

            // Check if code matches
            if (data.code === code) {
                console.log(`[EmailOtpService] OTP verified for ${email}`);
                await deleteDoc(doc(db, 'email_otps', docId));
                return true;
            }

            console.log(`[EmailOtpService] Invalid OTP for ${email}. Expected: ${data.code}, Got: ${code}`);
            return false;
        } catch (error) {
            console.error('[EmailOtpService] Error verifying OTP:', error);
            return false;
        }
    }
}

export const emailOtpService = new EmailOtpService();
