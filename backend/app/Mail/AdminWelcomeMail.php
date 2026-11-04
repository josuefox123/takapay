<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class AdminWelcomeMail extends Mailable
{
    use Queueable, SerializesModels;

    public string $loginUrl;

    public function __construct(
        public User $user,
        public ?string $temporaryPassword = null,
        public bool $isUpdate = false
    ) {
        $frontendBase = rtrim(env('FRONTEND_URL', 'http://localhost:5173'), '/');
        $this->loginUrl = $frontendBase . '/admin/connexion';
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: $this->isUpdate
                ? 'Mise à jour de votre compte - TakaPay'
                : 'Vos accès Administrateur - TakaPay',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.admin_welcome',
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
