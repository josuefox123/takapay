<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('livraisons', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cagnotte_id')->constrained('cagnottes')->cascadeOnDelete();
            $table->foreignId('adresse_id')->constrained('adresses')->cascadeOnDelete();
            $table->foreignId('livreur_id')->nullable()->constrained('livreurs')->nullOnDelete();
            $table->string('statut')->default('en_attente');
            $table->string('reference_suivi')->nullable();
            $table->decimal('frais_livraison', 10, 2)->default(0);
            $table->dateTime('date_demande')->nullable();
            $table->dateTime('date_prevue')->nullable();
            $table->dateTime('date_livraisonte')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('livraisons');
    }
};
