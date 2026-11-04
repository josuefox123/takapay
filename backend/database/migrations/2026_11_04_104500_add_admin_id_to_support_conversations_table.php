<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('support_conversations', 'admin_id')) {
            Schema::table('support_conversations', function (Blueprint $table) {
                $table->foreignId('admin_id')
                    ->nullable()
                    ->after('user_id')
                    ->constrained('users')
                    ->nullOnDelete();
            });
        }

        $superAdminId = DB::table('users')->where('role', 'super_admin')->value('id');
        $conversations = DB::table('support_conversations')->whereNull('admin_id')->get();

        foreach ($conversations as $conv) {
            $assignedAdminId = null;
            if ($conv->user_id) {
                $lastProduitId = DB::table('cagnottes')
                    ->where('utilisateur_id', $conv->user_id)
                    ->orderByDesc('id')
                    ->value('produit_id');

                if ($lastProduitId) {
                    $assignedAdminId = DB::table('produits')
                        ->where('id', $lastProduitId)
                        ->value('admin_id');
                }
            }

            DB::table('support_conversations')
                ->where('id', $conv->id)
                ->update(['admin_id' => $assignedAdminId ?: $superAdminId]);
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('support_conversations', 'admin_id')) {
            Schema::table('support_conversations', function (Blueprint $table) {
                $table->dropConstrainedForeignId('admin_id');
            });
        }
    }
};

