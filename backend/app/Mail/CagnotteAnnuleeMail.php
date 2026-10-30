<?php

namespace App\Mail;

use App\Models\Cagnotte;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class CagnotteAnnuleeMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Cagnotte $cagnotte,
        public ?User $user,
        public float $montantRemboursement,
        public float $fraisAnnulation,
        public string $telephone
    ) {
    }

    public function envelope(): Envelope
    {
        $nomProduit = $this->cagnotte->produit?->nom ?? 'votre article';
        return new Envelope(
            subject: 'Confirmation d\'annulation de votre cagnotte pour ' . $nomProduit . ' - TakaPay',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.cagnotte_annulee',
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
