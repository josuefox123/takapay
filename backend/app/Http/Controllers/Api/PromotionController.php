<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Promotion;
use Illuminate\Http\Request;
use App\Http\Resources\PromotionResource;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use App\Http\Requests\StorePromotionRequest;
use App\Http\Requests\UpdatePromotionRequest;

class PromotionController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(): AnonymousResourceCollection
    {
        return PromotionResource::collection(
            Promotion::latest()->paginate(15)
        );
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StorePromotionRequest $request): PromotionResource
    {
        $promotion = Promotion::create($request->validated());

        return new PromotionResource($promotion);
    }

    /**
     * Display the specified resource.
     */
    public function show(Promotion $promotion): PromotionResource 
    {
        return new PromotionResource($promotion);
    }

    /**
     * Update the specified resource in storage.
     */
   public function update(UpdatePromotionRequest $request,Promotion $promotion ): PromotionResource
    {
        $promotion->update($request->validated());

        return new PromotionResource($promotion);
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
