<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('promotions', function (Blueprint $table) {
            if (! Schema::hasColumn('promotions', 'admin_id')) {
                $table->foreignId('admin_id')->nullable()->after('id')->constrained('users')->nullOnDelete();
            }
            if (! Schema::hasColumn('promotions', 'produit_id')) {
                $table->foreignId('produit_id')->nullable()->after('admin_id')->constrained('produits')->nullOnDelete();
            }
            if (! Schema::hasColumn('promotions', 'titre')) {
                $table->string('titre')->nullable()->after('produit_id');
            }
            if (! Schema::hasColumn('promotions', 'description')) {
                $table->text('description')->nullable()->after('titre');
            }
            if (! Schema::hasColumn('promotions', 'image_popup')) {
                $table->string('image_popup')->nullable()->after('description');
            }
            if (! Schema::hasColumn('promotions', 'afficher_popup')) {
                $table->boolean('afficher_popup')->default(false)->after('image_popup');
            }
        });
    }

    public function down(): void
    {
        Schema::table('promotions', function (Blueprint $table) {
            if (Schema::hasColumn('promotions', 'produit_id')) {
                $table->dropConstrainedForeignId('produit_id');
            }
            if (Schema::hasColumn('promotions', 'admin_id')) {
                $table->dropConstrainedForeignId('admin_id');
            }
            $cols = array_filter(
                ['titre', 'description', 'image_popup', 'afficher_popup'],
                fn ($c) => Schema::hasColumn('promotions', $c)
            );
            if (! empty($cols)) {
                $table->dropColumn($cols);
            }
        });
    }
};

