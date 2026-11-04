<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Cagnotte;
use App\Models\Commande;
use App\Models\SupportConversation;
use App\Models\SupportMessage;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class SupportChatController extends Controller
{
    /**
     * Détermine l'administrateur lié au dernier produit de la dernière cagnotte commencée par le client.
     */
    private function resolveAssignedAdminId(?int $clientUserId): ?int
    {
        if ($clientUserId) {
            $latestCagnotte = Cagnotte::with('produit')
                ->where('utilisateur_id', $clientUserId)
                ->latest('id')
                ->first();

            if ($latestCagnotte?->produit?->admin_id) {
                return (int) $latestCagnotte->produit->admin_id;
            }

            $latestCommande = Commande::with('commandeProduits.produit')
                ->where('utilisateur_id', $clientUserId)
                ->latest('id')
                ->first();

            $cmdAdminId = $latestCommande?->commandeProduits?->first()?->produit?->admin_id;
            if ($cmdAdminId) {
                return (int) $cmdAdminId;
            }
        }

        $superAdminId = User::where('role', 'super_admin')->value('id');

        return $superAdminId ? (int) $superAdminId : null;
    }
    /**
     * Récupérer les messages pour le client (avec support du paramètre after_id)
     */
    public function getClientMessages(Request $request): JsonResponse
    {
        $token = $request->header('X-Support-Token')
            ?: $request->header('x-support-token')
            ?: $request->input('session_token');

        $user = auth('sanctum')->user();
        $userId = $user?->id ?: $request->input('user_id');

        $conversation = null;

        // 1. Si l'utilisateur est connecté, rechercher en priorité son fil de discussion
        if ($userId) {
            $conversation = SupportConversation::where('user_id', $userId)
                ->where('status', 'open')
                ->latest('last_message_at')
                ->first();
        }

        // 2. Sinon chercher par le token de session
        if (!$conversation && $token) {
            $conversation = SupportConversation::where('session_token', $token)->first();
        }

        // 3. Rattacher le compte utilisateur si trouvé par token
        if ($conversation && $userId && !$conversation->user_id) {
            $conversation->update(['user_id' => $userId]);
        }

        if (!$conversation) {
            return response()->json([
                'success' => true,
                'session_token' => $token,
                'conversation_id' => null,
                'status' => 'new',
                'messages' => [],
            ])->header('Cache-Control', 'no-cache, no-store, must-revalidate')
              ->header('Pragma', 'no-cache');
        }

        $query = $conversation->messages()->orderBy('id', 'asc');

        if ($request->filled('after_id')) {
            $query->where('id', '>', (int) $request->input('after_id'));
        }

        $messages = $query->get();

        // Marquer les messages envoyés par l'admin comme lus par le client
        $conversation->messages()
            ->where('sender_type', 'admin')
            ->where('is_read', false)
            ->update(['is_read' => true]);

        return response()->json([
            'success' => true,
            'session_token' => $conversation->session_token,
            'conversation_id' => $conversation->id,
            'status' => $conversation->status,
            'messages' => $messages,
        ])->header('Cache-Control', 'no-cache, no-store, must-revalidate')
          ->header('Pragma', 'no-cache');
    }

    /**
     * Envoyer un message depuis le widget client
     */
    public function sendClientMessage(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'message' => 'required|string|min:1|max:3000',
            'session_token' => 'nullable|string|max:64',
            'user_id' => 'nullable|integer',
            'name' => 'nullable|string|max:100',
            'email' => 'nullable|email|max:150',
        ]);

        $token = $request->header('X-Support-Token')
            ?: $request->header('x-support-token')
            ?: $request->input('session_token');

        $user = auth('sanctum')->user();
        $userId = $user?->id ?: $request->input('user_id');

        $conversation = null;
        $isNewConversation = false;

        // 1. Chercher la conversation de l'utilisateur s'il est connecté
        if ($userId) {
            $conversation = SupportConversation::where('user_id', $userId)
                ->where('status', 'open')
                ->latest('last_message_at')
                ->first();
        }

        // 2. Sinon chercher par token
        if (!$conversation && $token) {
            $conversation = SupportConversation::where('session_token', $token)->first();
        }

        $assignedAdminId = $this->resolveAssignedAdminId($userId ? (int) $userId : null);

        if (!$conversation) {
            $conversation = SupportConversation::create([
                'user_id' => $userId,
                'admin_id' => $assignedAdminId,
                'session_token' => $token ?: Str::random(60),
                'status' => 'open',
                'last_message_at' => now(),
            ]);
            $isNewConversation = true;
        } else {
            $updates = ['last_message_at' => now()];
            if ($userId && !$conversation->user_id) {
                $updates['user_id'] = $userId;
            }
            if ($assignedAdminId) {
                $updates['admin_id'] = $assignedAdminId;
            }
            $conversation->update($updates);
        }

        $cleanMessage = trim(strip_tags($validated['message']));
        if ($cleanMessage === '') {
            return response()->json([
                'message' => 'Le message ne peut pas être vide.',
                'errors' => ['message' => ['Le message ne peut pas être vide.']],
            ], 422);
        }

        $message = SupportMessage::create([
            'conversation_id' => $conversation->id,
            'sender_type' => 'client',
            'sender_id' => $userId,
            'message' => $cleanMessage,
            'is_read' => false,
        ]);

        return response()->json([
            'success' => true,
            'session_token' => $conversation->session_token,
            'conversation_id' => $conversation->id,
            'message' => $message,
        ], 201);
    }

    /**
     * ADMIN : Liste des conversations avec compteur de messages non lus
     */
    public function adminListConversations(Request $request): JsonResponse
    {
        $admin = $request->user();
        $query = SupportConversation::with(['user:id,nom,prenom,email,telephone', 'admin:id,nom,prenom,email', 'latestMessage'])
            ->withCount('unreadMessagesForAdmin')
            ->orderByDesc('last_message_at');

        if ($admin && $admin->role === 'admin') {
            $query->where('admin_id', $admin->id);
        }

        $conversations = $query->paginate($request->integer('per_page', 20));

        return response()->json([
            'success' => true,
            'data' => $conversations,
        ]);
    }

    /**
     * ADMIN : Détails et fil de messages d'une conversation
     */
    public function adminGetConversation(Request $request, $id): JsonResponse
    {
        $admin = $request->user();
        $conversation = SupportConversation::with(['user:id,nom,prenom,email,telephone', 'admin:id,nom,prenom,email'])
            ->findOrFail($id);

        if ($admin && $admin->role === 'admin' && (int) $conversation->admin_id !== (int) $admin->id) {
            abort(403, 'Accès non autorisé à cette conversation.');
        }

        $messages = $conversation->messages()
            ->orderBy('id', 'asc')
            ->get();

        // Marquer les messages clients comme lus uniquement si c'est l'admin assigné (ou si assigné au super_admin)
        if (! $admin || $admin->role !== 'super_admin' || (int) $conversation->admin_id === (int) $admin->id) {
            $conversation->messages()
                ->where('sender_type', 'client')
                ->where('is_read', false)
                ->update(['is_read' => true]);
        }

        return response()->json([
            'success' => true,
            'conversation' => $conversation,
            'messages' => $messages,
        ]);
    }

    /**
     * ADMIN : Répondre au client
     */
    public function adminReply(Request $request, $id): JsonResponse
    {
        $validated = $request->validate([
            'message' => 'required|string|min:1|max:3000',
        ]);

        $conversation = SupportConversation::findOrFail($id);
        $admin = $request->user() ?? auth()->user();

        if ($admin && $admin->role === 'admin' && (int) $conversation->admin_id !== (int) $admin->id) {
            abort(403, 'Accès non autorisé à cette conversation.');
        }

        $cleanReply = trim(strip_tags($validated['message']));
        if ($cleanReply === '') {
            return response()->json([
                'message' => 'Le message ne peut pas être vide.',
                'errors' => ['message' => ['Le message ne peut pas être vide.']],
            ], 422);
        }

        $message = SupportMessage::create([
            'conversation_id' => $conversation->id,
            'sender_type' => 'admin',
            'sender_id' => $admin?->id,
            'message' => $cleanReply,
            'is_read' => false,
        ]);

        $conversation->update(['last_message_at' => now()]);

        return response()->json([
            'success' => true,
            'message' => $message,
        ], 201);
    }

    /**
     * ADMIN : Compteur global de messages non lus (pastille légère)
     */
    public function adminUnreadCount(Request $request): JsonResponse
    {
        $admin = $request->user();
        $query = SupportMessage::where('sender_type', 'client')
            ->where('is_read', false);

        if ($admin && $admin->role === 'admin') {
            $query->whereHas('conversation', fn ($q) => $q->where('admin_id', $admin->id));
        }

        $count = $query->count();

        return response()->json([
            'success' => true,
            'unread_count' => $count,
        ]);
    }

    /**
     * ADMIN : Clôturer une conversation
     */
    public function adminCloseConversation($id): JsonResponse
    {
        $conversation = SupportConversation::findOrFail($id);
        $conversation->update(['status' => 'closed']);

        return response()->json([
            'success' => true,
            'message' => 'Conversation clôturée avec succès.',
        ]);
    }
}
