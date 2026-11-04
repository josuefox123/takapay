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
        if (! $user) {
            return NotificationResource::collection(collect());
        }

        $query = Notification::query()->latest();

        if ($user->isAdmin() && $request->filled('user_id')) {
            $query->where('utilisateur_id', $request->query('user_id'));
        } else {
            $query->where('utilisateur_id', $user->id);
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
        $user = $request->user('sanctum') ?? $request->user();
        if (! $user) {
            abort(401, 'Non authentifié.');
        }
        if (! $user->isAdmin() && (int) $notification->utilisateur_id !== (int) $user->id) {
            abort(403, 'Accès refusé.');
        }

        $notification->update(['statut' => 'lu']);
        return new NotificationResource($notification);
    }

    /**
     * Marquer toutes les notifications d'un utilisateur comme lues.
     */
    public function toutMarquerCommeLu(Request $request)
    {
        $user = $request->user('sanctum') ?? $request->user();
        if (! $user) {
            abort(401, 'Non authentifié.');
        }

        $userId = ($user->isAdmin() && ($request->filled('user_id') || $request->query('user_id')))
            ? ($request->input('user_id') ?? $request->query('user_id'))
            : $user->id;

        Notification::where('utilisateur_id', $userId)->update(['statut' => 'lu']);

        return response()->json(['message' => 'Toutes les notifications ont été marquées comme lues.']);
    }

    /**
     * Compteurs non-répétitifs de nouveautés par menu ('cagnottes', 'commandes') pour l'admin connecté.
     */
    public function adminMenuCounts(Request $request)
    {
        $user = $request->user();
        if (! $user) {
            return response()->json(['cagnottes' => 0, 'commandes' => 0]);
        }

        $cagnottesCount = Notification::where('utilisateur_id', $user->id)
            ->where('type', 'admin_cagnotte')
            ->where('statut', 'non_lu')
            ->count();

        $commandesCount = Notification::where('utilisateur_id', $user->id)
            ->where('type', 'admin_commande')
            ->where('statut', 'non_lu')
            ->count();

        return response()->json([
            'cagnottes' => $cagnottesCount,
            'commandes' => $commandesCount,
        ]);
    }

    /**
     * Marquer les notifications d'un menu ('cagnottes' ou 'commandes') comme lues pour l'admin connecté.
     */
    public function markAdminMenuRead(Request $request)
    {
        $user = $request->user();
        if (! $user) {
            return response()->json(['success' => false], 401);
        }

        $menu = $request->input('menu');
        $typeMap = [
            'cagnottes' => 'admin_cagnotte',
            'commandes' => 'admin_commande',
        ];

        if (isset($typeMap[$menu])) {
            Notification::where('utilisateur_id', $user->id)
                ->where('type', $typeMap[$menu])
                ->where('statut', 'non_lu')
                ->update(['statut' => 'lu']);
        }

        return response()->json(['success' => true]);
    }
}
