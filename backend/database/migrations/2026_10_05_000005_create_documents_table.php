<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('utilisateur_id')->constrained('users')->cascadeOnDelete();
            $table->string('type');
            $table->string('chemin');
            $table->string('nom_origine')->nullable();
            $table->string('type_fichier')->nullable();
            $table->bigInteger('taille')->nullable();
            $table->string('statut')->default('en_attente');
            $table->timestamp('date_modification')->nullable();
            $table->foreignId('verifier_par')->nullable()->constrained('users')->nullOnDelete();
            $table->text('motif')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('documents');
    }
};
