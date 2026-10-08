<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreAuditRequest;
use App\Http\Requests\UpdateAuditRequest;
use App\Http\Resources\AuditResource;
use Illuminate\Http\JsonResponse;
use App\Models\Audit;

class AuditController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
      return AuditResource::collection(Audit::latest()->get());
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreAuditRequest $request)
{
$audit = Audit::create($request->validated());
return (new AuditResource($audit))
->response()
->setStatusCode(201);
}

    /**
     * Display the specified resource.
     */
   public function show(Audit $audit)
{
return new AuditResource($audit);
}
    /**
     * Update the specified resource in storage.
     */

     public function update(UpdateAuditRequest $request, Audit $audit): AuditResource 
     {
        $audit->update($request->validated());

        return new AuditResource($audit);
    }

    /**
     * Supprimer un audit.
     */
    public function destroy(Audit $audit): JsonResponse
    {
        $audit->delete();

        return response()->json([
            'message' => 'Audit supprimée avec succès.'
        ]);
    }
    
}
