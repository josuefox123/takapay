<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreAuditRequest;
use App\Http\Resources\AuditResource;
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
    
}
