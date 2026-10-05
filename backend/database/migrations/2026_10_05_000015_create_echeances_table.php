<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('echeances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cagnotte_id')->constrained('cagnottes')->cascadeOnDelete();
            $table->integer('numero');
            $table->date('date_prevue');
            $table->decimal('montant_attendu', 12, 2);
            $table->string('statut')->default('en_attente');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('echeances');
    }
};
