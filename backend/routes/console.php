<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('admin:reset-password {email? : Adresse email du compte administrateur ou super-administrateur} {--password= : Nouveau mot de passe (optionnel, sinon généré aléatoirement)}', function () {
    $email = $this->argument('email');
    if (! $email) {
        $email = $this->ask('Adresse email du compte administrateur / super_admin');
    }

    $user = \App\Models\User::where('email', trim($email))
        ->whereIn('role', ['super_admin', 'admin'])
        ->first();

    if (! $user) {
        $this->error("Aucun compte administrateur trouvé avec l'email : {$email}");
        return 1;
    }

    $newPassword = $this->option('password');
    if (! $newPassword) {
        $chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*';
        $newPassword = 'Tk@' . substr(str_shuffle($chars), 0, 9);
    }

    $user->password = \Illuminate\Support\Facades\Hash::make($newPassword);
    $user->must_change_password = true;
    $user->save();

    // Révocation immédiate de toutes les sessions actives
    $user->tokens()->delete();

    $this->info('=================================================');
    $this->info('Mot de passe administrateur réinitialisé avec succès !');
    $this->line("Utilisateur : <comment>{$user->prenom} {$user->nom} ({$user->email})</comment>");
    $this->line("Rôle        : <comment>{$user->role}</comment>");
    $this->line("Nouveau mot de passe temporaire : <error> {$newPassword} </error>");
    $this->line('Statut      : <comment>Changement de mot de passe obligatoire dès la prochaine connexion.</comment>');
    $this->info('=================================================');

    return 0;
})->purpose('Réinitialiser de manière sécurisée le mot de passe d\'un administrateur ou super-administrateur');
