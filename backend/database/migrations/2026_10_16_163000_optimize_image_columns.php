<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('image_produits', function (Blueprint $table) {
            $table->string('chemin', 255)->change();
        });

        Schema::table('categories', function (Blueprint $table) {
            $table->string('image', 255)->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('image_produits', function (Blueprint $table) {
            $table->longText('chemin')->change();
        });

        Schema::table('categories', function (Blueprint $table) {
            $table->longText('image')->nullable()->change();
        });
    }
};
