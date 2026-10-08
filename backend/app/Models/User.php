<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'nom',
        'prenom',
        'email',
        'telephone',
        'password',
        'photo_profil',
        'role',
        'latitude',
        'longitude',
        'statut_compte',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'latitude' => 'decimal:8',
            'longitude' => 'decimal:8',
        ];
    }

    public function adresses(): HasMany
    {
        return $this->hasMany(Adresse::class, 'utilisateur_id');
    }

    public function documents(): HasMany
    {
        return $this->hasMany(Document::class, 'utilisateur_id');
    }

    public function livreur(): HasOne
    {
        return $this->hasOne(Livreur::class, 'utilisateur_id');
    }

    public function audits(): HasMany
    {
        return $this->hasMany(Audit::class, 'utilisateur_id');
    }

    public function notifications(): HasMany
    {
        return $this->hasMany(Notification::class, 'utilisateur_id');
    }

    public function commandes(): HasMany
    {
        return $this->hasMany(Commande::class, 'utilisateur_id');
    }
}
