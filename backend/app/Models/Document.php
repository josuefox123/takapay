<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Document extends Model
{
    use HasFactory;

    protected $table = 'documents';

    protected $fillable = [
        'utilisateur_id',
        'type',
        'chemin',
        'nom_origine',
        'type_fichier',
        'taille',
        'statut',
        'date_modification',
        'verifier_par',
        'motif',
    ];

    protected function casts(): array
    {
        return [
            'date_modification' => 'datetime',
            'taille' => 'integer',
        ];
    }

    public function utilisateur(): BelongsTo
    {
        return $this->belongsTo(User::class, 'utilisateur_id');
    }

    public function verificateur(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verifier_par');
    }
}
