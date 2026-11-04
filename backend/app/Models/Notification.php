<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Notification extends Model
{
    use HasFactory;

    protected $table = 'notifications';

    protected $fillable = [
        'utilisateur_id',
        'cagnotte_id',
        'titre',
        'message',
        'type',
        'statut',
    ];

    public function utilisateur(): BelongsTo
    {
        return $this->belongsTo(User::class, 'utilisateur_id');
    }

    public function cagnotte(): BelongsTo
    {
        return $this->belongsTo(Cagnotte::class, 'cagnotte_id');
    }

    /**
     * Crée une notification de menu ('admin_cagnotte' ou 'admin_commande')
     * uniquement pour l'administrateur créateur du produit ainsi que le(s) super_admin.
     */
    public static function notifyProductAdmins(
        ?Produit $produit,
        ?int $cagnotteId,
        string $menuType,
        string $titre,
        string $message
    ): void {
        $ownerAdminId = $produit?->admin_id;
        $superAdminIds = User::where('role', 'super_admin')->pluck('id')->all();

        $recipientIds = array_values(array_unique(array_filter(array_merge(
            $ownerAdminId ? [(int) $ownerAdminId] : [],
            array_map('intval', $superAdminIds)
        ))));

        foreach ($recipientIds as $adminId) {
            self::create([
                'utilisateur_id' => $adminId,
                'cagnotte_id' => $cagnotteId,
                'titre' => $titre,
                'message' => $message,
                'type' => $menuType,
                'statut' => 'non_lu',
            ]);
        }
    }
}
