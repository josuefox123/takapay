<?php

namespace App\Mail;

use App\Models\Cagnotte;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class CagnotteRetablieMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Cagnotte $cagnotte,
        public ?User $user = null,
        public bool $isAdmin = false
    ) {
    }

    public function envelope(): Envelope
    {
        $nomProduit = $this->cagnotte->produit?->nom ?? 'votre article';
        $subject = $this->isAdmin
            ? '🔄 [Admin TakaPay] Cagnotte rétablie par le client - ' . $nomProduit . ' (#' . $this->cagnotte->id . ')'
            : '🎉 Confirmation du rétablissement de votre cagnotte pour ' . $nomProduit . ' - TakaPay';

        return new Envelope(
            subject: $subject,
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.cagnotte_retablie',
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
