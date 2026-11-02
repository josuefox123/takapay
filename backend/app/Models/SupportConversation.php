<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class SupportConversation extends Model
{
    use HasFactory;

    protected $table = 'support_conversations';

    protected $fillable = [
        'user_id',
        'session_token',
        'status',
        'last_message_at',
    ];

    protected $casts = [
        'last_message_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function messages(): HasMany
    {
        return $this->hasMany(SupportMessage::class, 'conversation_id');
    }

    public function latestMessage(): HasOne
    {
        return $this->hasOne(SupportMessage::class, 'conversation_id')->latestOfMany();
    }

    public function unreadMessagesForAdmin(): HasMany
    {
        return $this->hasMany(SupportMessage::class, 'conversation_id')
            ->where('sender_type', 'client')
            ->where('is_read', false);
    }

    public function unreadMessagesForClient(): HasMany
    {
        return $this->hasMany(SupportMessage::class, 'conversation_id')
            ->where('sender_type', 'admin')
            ->where('is_read', false);
    }
}
