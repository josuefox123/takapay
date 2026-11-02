<?php

namespace App\Mail;

use App\Models\SupportConversation;
use App\Models\SupportMessage;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class NewSupportMessageMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public SupportConversation $conversation,
        public SupportMessage $supportMessage,
        public ?string $senderName = null
    ) {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Nouveau message reçu sur le Service Clientèle - TakaPay',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.new_support_message',
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
