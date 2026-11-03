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
        public string $telephone,
        public bool $isAdmin = false
    ) {
    }

    public function envelope(): Envelope
    {
        $nomProduit = $this->cagnotte->produit?->nom ?? 'votre article';
        $subject = $this->isAdmin
            ? '⚠️ [Admin TakaPay] Demande d\'annulation de cagnotte - ' . $nomProduit . ' (#' . $this->cagnotte->id . ')'
            : 'Confirmation d\'annulation de votre cagnotte pour ' . $nomProduit . ' - TakaPay';

        return new Envelope(
            subject: $subject,
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
