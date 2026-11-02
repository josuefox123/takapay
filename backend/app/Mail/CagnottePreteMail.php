<?php

namespace App\Mail;

use App\Models\Cagnotte;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class CagnottePreteMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Cagnotte $cagnotte,
        public User $user
    ) {
    }

    public function envelope(): Envelope
    {
        $nomProduit = $this->cagnotte->produit?->nom ?? 'votre article';
        return new Envelope(
            subject: '🎉 Félicitations ! Votre cagnotte pour ' . $nomProduit . ' est prête - TakaPay',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.cagnotte_prete',
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
