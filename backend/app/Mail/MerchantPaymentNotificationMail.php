<?php

namespace App\Mail;

use App\Models\Cagnotte;
use App\Models\Commande;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class MerchantPaymentNotificationMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Commande $commande,
        public User $user,
        public float $montant,
        public string $transactionId,
        public string $network,
        public ?Cagnotte $cagnotte = null
    ) {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: '💰 Nouveau paiement reçu : ' . number_format($this->montant, 0, ',', ' ') . ' FCFA (Réf: ' . $this->commande->reference . ')',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.merchant_payment_notification',
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
