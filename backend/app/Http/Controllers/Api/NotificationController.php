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
     * Liste des notifications : celles de l'utilisateur, ou toutes pour un administrateur.
     */
    public function index(Request $request)
    {
        $user = $request->user();

        $query = $user->isAdmin()
            ? Notification::query()
            : Notification::where('utilisateur_id', $user->id);

        return NotificationResource::collection($query->latest()->get());
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
}
