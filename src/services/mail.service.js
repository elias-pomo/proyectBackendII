// src/services/mail.service.js
import nodemailer from 'nodemailer';
import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';

const TZ = 'America/Argentina/Buenos_Aires';

const escapeHtml = (text) =>
    String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const formatDateTime = (date) =>
    new Date(date).toLocaleString('es-AR', {
        weekday: 'long', day: 'numeric', month: 'long',
        hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ
    });

const row = (label, value) =>
    `<tr><td style="padding:4px 12px 4px 0;color:#666">${label}</td><td style="padding:4px 0"><strong>${escapeHtml(value)}</strong></td></tr>`;

// Estructura común de los correos: encabezado de la marca, mensaje, tabla de datos y nota final.
// `message` y `note` son HTML que arma este archivo; los datos de usuarios se escapan en `row` y al armar `message`.
const emailHtml = ({ message, rows, note }) => `
<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;border:1px solid #ddd;border-radius:8px;overflow:hidden">
  <div style="background:#000;color:#fff;padding:16px 20px;font-size:20px;font-weight:bold">
    Ringo Box <span style="color:#d71920">Gym</span>
  </div>
  <div style="padding:20px;color:#222">
    <p>${message}</p>
    <table style="border-collapse:collapse">
      ${rows.map(([label, value]) => row(label, value)).join('\n      ')}
    </table>
    <p style="color:#666;font-size:14px;margin-top:16px">${note}</p>
  </div>
</div>`;

export class MailService {
    #transporter = null;

    isConfigured() {
        const { HOST, PORT, USER, PASS, FROM } = config.mail;
        return Boolean(HOST && PORT && USER && PASS && FROM);
    }

    #getTransporter() {
        if (!this.#transporter) {
            const { HOST, PORT, USER, PASS } = config.mail;
            this.#transporter = nodemailer.createTransport({
                host: HOST,
                port: Number(PORT),
                secure: Number(PORT) === 465,   // 465 usa TLS directo; 587 usa STARTTLS
                auth: { user: USER, pass: PASS }
            });
        }
        return this.#transporter;
    }

    async #send({ to, subject, text, html }) {
    if (!this.isConfigured()) {
        logger.warn('Email no enviado: faltan variables MAIL_* en el .env');
        return;
    }
    await this.#getTransporter().sendMail({ from: config.mail.FROM, to, subject, text, html });
}

    async sendTicketConfirmation({ to, name, event, ticket }) {
        const when = formatDateTime(event.date);
        const note = 'Presentá este código al llegar. Si no podés asistir, cancelá tu inscripción para liberar el lugar.';

        const text = [
            `Hola ${name},`,
            '',
            'Tu inscripción quedó confirmada.',
            '',
            `Clase: ${event.title}`,
            `Cuándo: ${when}`,
            `Dónde: ${event.location}`,
            `Lugares reservados: ${ticket.quantity}`,
            `Código de reserva: ${ticket.reservationCode}`,
            '',
            note,
            '',
            'Ringo Box Gym'
        ].join('\n');

        const html = emailHtml({
            message: `Hola ${escapeHtml(name)}, tu inscripción quedó <strong>confirmada</strong>.`,
            rows: [
                ['Clase', event.title],
                ['Cuándo', when],
                ['Dónde', event.location],
                ['Lugares', ticket.quantity],
                ['Código de reserva', ticket.reservationCode]
            ],
            note
        });

        await this.#send({
            to,
            subject: `Inscripción confirmada: ${event.title}`,
            text,
            html,
            label: `Email de confirmación (${ticket.reservationCode})`
        });
    }

    async sendTicketCancellation({ to, name, event, ticket, cancelledByAdmin = false }) {
        const when = formatDateTime(event.date);
        const intro = cancelledByAdmin
            ? 'Tu inscripción fue cancelada por la administración del gimnasio.'
            : 'Tu inscripción quedó cancelada.';
        const note = cancelledByAdmin
            ? 'Si creés que se trató de un error, comunicate con el gimnasio.'
            : 'El lugar quedó disponible para otras personas. Si querés volver a anotarte, podés inscribirte de nuevo mientras haya cupo.';

        const text = [
            `Hola ${name},`,
            '',
            intro,
            '',
            `Clase: ${event.title}`,
            `Cuándo: ${when}`,
            `Dónde: ${event.location}`,
            `Lugares liberados: ${ticket.quantity}`,
            `Código de reserva: ${ticket.reservationCode}`,
            '',
            note,
            '',
            'Ringo Box Gym'
        ].join('\n');

        const html = emailHtml({
            message: `Hola ${escapeHtml(name)}, ${cancelledByAdmin
                ? 'tu inscripción fue <strong>cancelada por la administración</strong> del gimnasio.'
                : 'tu inscripción quedó <strong>cancelada</strong>.'}`,
            rows: [
                ['Clase', event.title],
                ['Cuándo', when],
                ['Dónde', event.location],
                ['Lugares liberados', ticket.quantity],
                ['Código de reserva', ticket.reservationCode]
            ],
            note
        });

        await this.#send({
            to,
            subject: `Inscripción cancelada: ${event.title}`,
            text,
            html,
            label: `Email de cancelación (${ticket.reservationCode})`
        });
    }
}