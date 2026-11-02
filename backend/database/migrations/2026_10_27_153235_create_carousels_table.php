<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('carousels', function (Blueprint $table) {
            $table->id();
            $table->string('titre');
            $table->text('description')->nullable();
            $table->string('kicker', 100)->nullable();
            $table->string('image');
            $table->string('texte_bouton', 100)->nullable();
            $table->string('lien')->nullable();
            $table->foreignId('produit_id')->nullable()->constrained('produits')->nullOnDelete();
            $table->integer('ordre')->default(0);
            $table->boolean('is_actif')->default(true);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('carousels');
    }
};
