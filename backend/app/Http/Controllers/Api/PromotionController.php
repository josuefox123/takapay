<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StorePromotionRequest;
use App\Http\Requests\UpdatePromotionRequest;
use App\Http\Resources\PromotionResource;
use App\Models\ParametreProduit;
use App\Models\Promotion;
use App\Services\ImageStorageService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class PromotionController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $user = $request->user('sanctum') ?? $request->user();
        if (! $user && $request->bearerToken()) {
            $accessToken = \Laravel\Sanctum\PersonalAccessToken::findToken($request->bearerToken());
            if ($accessToken && $accessToken->tokenable) {
                $user = $accessToken->tokenable;
            }
        }

        $query = Promotion::with('produit')->latest();

        if ($user && $user->role === 'admin') {
            $query->where(function ($q) use ($user) {
                $q->where('admin_id', $user->id)
                    ->orWhereNull('admin_id');
            });
        }

        return PromotionResource::collection($query->paginate(50));
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StorePromotionRequest $request): PromotionResource
    {
        $data = $request->validated();
        $data['admin_id'] = $request->user()?->id;

        if (! empty($data['image_popup']) && is_string($data['image_popup']) && str_starts_with($data['image_popup'], 'data:')) {
            $savedPath = app(ImageStorageService::class)->process($data['image_popup'], 'promotions', null, 'image_popup');
            $data['image_popup'] = $savedPath;
        } elseif ($request->hasFile('image_popup')) {
            $data['image_popup'] = $request->file('image_popup')->store('promotions', 'public');
        }

        $promotion = Promotion::create($data);

        if (! empty($promotion->produit_id) && (float) $promotion->pourcentage_promo > 0) {
            ParametreProduit::where('produit_id', $promotion->produit_id)
                ->update(['promotion_id' => $promotion->id]);
        }

        return new PromotionResource($promotion->load('produit'));
    }

    /**
     * Display the specified resource.
     */
    public function show(Promotion $promotion): PromotionResource
    {
        return new PromotionResource($promotion->load('produit'));
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdatePromotionRequest $request, Promotion $promotion): PromotionResource
    {
        $data = $request->validated();

        if (array_key_exists('image_popup', $data)) {
            if (! empty($data['image_popup']) && is_string($data['image_popup']) && str_starts_with($data['image_popup'], 'data:')) {
                $savedPath = app(ImageStorageService::class)->process($data['image_popup'], 'promotions', $promotion->image_popup, 'image_popup');
                $data['image_popup'] = $savedPath;
            } elseif (empty($data['image_popup'])) {
                $data['image_popup'] = null;
            }
        } elseif ($request->hasFile('image_popup')) {
            $data['image_popup'] = $request->file('image_popup')->store('promotions', 'public');
        }

        $promotion->update($data);

        if (! empty($promotion->produit_id) && (float) $promotion->pourcentage_promo > 0) {
            ParametreProduit::where('produit_id', $promotion->produit_id)
                ->update(['promotion_id' => $promotion->id]);
        }

        return new PromotionResource($promotion->fresh('produit'));
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Promotion $promotion)
    {
        $promotion->delete();

        return response()->json(['message' => 'Promotion supprimée avec succès']);
    }
}
