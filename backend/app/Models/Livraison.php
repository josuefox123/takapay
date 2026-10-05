<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Livraison extends Model
{
    use HasFactory;

    protected $table = 'livraisons';

    protected $fillable = [
        'cagnotte_id',
        'adresse_id',
        'livreur_id',
        'statut',
        'reference_suivi',
        'frais_livraison',
        'date_demande',
        'date_prevue',
        'date_livraisonte',
    ];

    protected function casts(): array
    {
        return [
            'frais_livraison' => 'decimal:2',
            'date_demande' => 'datetime',
            'date_prevue' => 'datetime',
            'date_livraisonte' => 'datetime',
        ];
    }

    public function cagnotte(): BelongsTo
    {
        return $this->belongsTo(Cagnotte::class, 'cagnotte_id');
    }

    public function adresse(): BelongsTo
    {
        return $this->belongsTo(Adresse::class, 'adresse_id');
    }

    public function livreur(): BelongsTo
    {
        return $this->belongsTo(Livreur::class, 'livreur_id');
    }
}
