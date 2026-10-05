<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('parametre_produits', function (Blueprint $table) {
            $table->id();
            $table->foreignId('produit_id')->constrained('produits')->cascadeOnDelete();
            $table->foreignId('promotion_id')->nullable()->constrained('promotions')->nullOnDelete();
            $table->string('reference')->nullable();
            $table->decimal('prix_minimum', 12, 2)->nullable();
            $table->decimal('prix_echelonne', 12, 2)->nullable();
            $table->decimal('prix_total', 12, 2);
            $table->string('mode_paiement')->nullable();
            $table->date('date_echeance')->nullable();
            $table->string('frequence')->nullable();
            $table->decimal('seuil_livraison', 12, 2)->nullable();
            $table->decimal('prix_cash', 12, 2)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('parametre_produits');
    }
};
