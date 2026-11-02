<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ResetPinMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public User $user,
        public string $code
    ) {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Votre code de réinitialisation PIN - TakaPay',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.reset_pin',
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
