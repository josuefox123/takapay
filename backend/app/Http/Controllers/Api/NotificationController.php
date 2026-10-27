<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreNotificationRequest;
use App\Http\Requests\UpdateNotificationRequest;
use App\Http\Resources\NotificationResource;
use App\Models\Notification;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    /**
     * Liste des notifications : filtrées par utilisateur connecté ou administrateur.
     */
    public function index(Request $request)
    {
        $user = $request->user('sanctum') ?? $request->user();
        $userId = $request->query('user_id') ?? $user?->id;

        $query = Notification::query()->latest();

        if ($userId && (!$user || $user->role === 'client')) {
            $query->where('utilisateur_id', $userId);
        } elseif (!$user || $user->role === 'client') {
            if ($user) {
                $query->where('utilisateur_id', $user->id);
            } else {
                return NotificationResource::collection(collect());
            }
        }

        return NotificationResource::collection($query->get());
    }

    /**
     * Créer une notification (administration).
     */
    public function store(StoreNotificationRequest $request)
    {
        $notification = Notification::create($request->validated());

        return (new NotificationResource($notification))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Afficher une notification.
     */
    public function show(Request $request, Notification $notification)
    {
        $this->authorizeOwnerOrAdmin($request, $notification);

        return new NotificationResource($notification);
    }

    /**
     * Modifier une notification.
     */
    public function update(UpdateNotificationRequest $request, Notification $notification)
    {
        $notification->update($request->validated());

        return new NotificationResource($notification);
    }

    /**
     * Supprimer une notification.
     */
    public function destroy(Request $request, Notification $notification)
    {
        $this->authorizeOwnerOrAdmin($request, $notification);

        $notification->delete();

        return response()->noContent();
    }

    /**
     * Marquer une notification comme lue.
     */
    public function marquerCommeLu(Request $request, Notification $notification)
    {
        $notification->update(['statut' => 'lu']);
        return new NotificationResource($notification);
    }

    /**
     * Marquer toutes les notifications d'un utilisateur comme lues.
     */
    public function toutMarquerCommeLu(Request $request)
    {
        $user = $request->user('sanctum') ?? $request->user();
        $userId = $request->input('user_id') ?? $request->query('user_id') ?? $user?->id;

        if ($userId) {
            Notification::where('utilisateur_id', $userId)->update(['statut' => 'lu']);
        }

        return response()->json(['message' => 'Toutes les notifications ont été marquées comme lues.']);
    }
}
