<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('produits', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sous_categorie_id')->constrained('sous_categories')->cascadeOnDelete();
            $table->string('nom');
            $table->text('description')->nullable();
            $table->integer('stock')->default(0);
            $table->integer('duree')->nullable();
            $table->string('couleur')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('produits');
    }
};
