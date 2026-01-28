import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { providersService } from '../services/playlist.service';
import { useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Link as LinkIcon, Unlink, Loader2 } from 'lucide-react';

export default function ProvidersPage() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['providers'],
    queryFn: providersService.getProviders,
  });

  const disconnectMutation = useMutation({
    mutationFn: providersService.disconnectProvider,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['providers'] });
      setNotification({ type: 'success', message: 'Provider disconnected successfully' });
    },
    onError: () => {
      setNotification({ type: 'error', message: 'Failed to disconnect provider' });
    },
  });

  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');

    if (success) {
      setNotification({ type: 'success', message: `${success} connected successfully!` });
      // Clear the URL params
      window.history.replaceState({}, '', '/providers');
    } else if (error) {
      setNotification({ type: 'error', message: `Connection failed: ${error}` });
      window.history.replaceState({}, '', '/providers');
    }
  }, [searchParams]);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const handleConnect = (provider: 'spotify' | 'soundcloud') => {
    // Need to include auth token in the URL for the redirect
    const token = localStorage.getItem('auth-storage');
    const authData = token ? JSON.parse(token) : null;
    const accessToken = authData?.state?.accessToken;

    if (!accessToken) {
      setNotification({ type: 'error', message: 'Please log in again' });
      return;
    }

    // Open in same window to allow OAuth redirect
    window.location.href = providersService.getConnectUrl(provider);
  };

  const handleDisconnect = (provider: 'spotify' | 'soundcloud') => {
    if (confirm(`Are you sure you want to disconnect ${provider}?`)) {
      disconnectMutation.mutate(provider);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-spotify-green" size={40} />
      </div>
    );
  }

  const providers = data?.providers || [];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Connected Providers</h1>
        <p className="text-neutral-400">
          Connect your Spotify and SoundCloud accounts using secure OAuth login to access your playlists.
        </p>
        <p className="text-neutral-500 text-sm mt-2">
          You'll be redirected to the official provider login page - no manual tokens needed.
        </p>
      </div>

      {/* Notification */}
      {notification && (
        <div
          className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
            notification.type === 'success'
              ? 'bg-green-500/10 border border-green-500/30 text-green-400'
              : 'bg-red-500/10 border border-red-500/30 text-red-400'
          }`}
        >
          {notification.type === 'success' ? <CheckCircle size={20} /> : <XCircle size={20} />}
          {notification.message}
        </div>
      )}

      {/* Providers List */}
      <div className="space-y-4">
        {providers.map((provider) => (
          <div
            key={provider.id}
            className="bg-neutral-800 rounded-xl p-6 flex items-center gap-6"
          >
            {/* Provider Icon */}
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center ${
                provider.id === 'spotify'
                  ? 'bg-spotify-green'
                  : 'bg-soundcloud-orange'
              }`}
            >
              {provider.id === 'spotify' ? (
                <svg viewBox="0 0 24 24" className="w-8 h-8 text-white" fill="currentColor">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="w-8 h-8 text-white" fill="currentColor">
                  <path d="M1.175 12.225c-.051 0-.094.046-.101.1l-.233 2.154.233 2.105c.007.054.05.1.101.1.05 0 .09-.046.099-.1l.255-2.105-.27-2.154c-.01-.054-.052-.1-.102-.1zm1.15-.424c-.065 0-.116.053-.123.117l-.219 2.578.219 2.537c.007.065.058.116.123.116.065 0 .115-.051.122-.116l.246-2.537-.246-2.578c-.007-.064-.057-.117-.122-.117zm1.22-.397c-.079 0-.14.064-.147.143l-.178 2.975.178 2.922c.007.079.068.142.147.142.079 0 .14-.063.147-.142l.202-2.922-.202-2.975c-.007-.079-.068-.143-.147-.143zm1.223-.339c-.093 0-.166.074-.173.167l-.155 3.314.155 3.252c.007.093.08.166.173.166.093 0 .165-.073.173-.166l.176-3.252-.176-3.314c-.008-.093-.08-.167-.173-.167zm1.271-.213c-.107 0-.19.084-.198.191l-.132 3.527.132 3.453c.008.107.091.19.198.19.107 0 .19-.083.197-.19l.15-3.453-.15-3.527c-.007-.107-.09-.191-.197-.191zm1.296-.027c-.121 0-.214.093-.221.215l-.12 3.554.12 3.479c.007.121.1.214.221.214.121 0 .214-.093.222-.214l.135-3.479-.135-3.554c-.008-.122-.101-.215-.222-.215zm1.32.199c-.135 0-.242.107-.25.241l-.097 3.355.097 3.28c.008.134.115.241.25.241.135 0 .241-.107.249-.241l.11-3.28-.11-3.355c-.008-.134-.114-.241-.249-.241zm1.343.177c-.15 0-.27.12-.278.27l-.074 3.178.074 3.103c.008.149.128.269.278.269.149 0 .269-.12.277-.269l.084-3.103-.084-3.178c-.008-.15-.128-.27-.277-.27zm1.39.054c-.163 0-.293.13-.301.294l-.052 3.124.052 3.048c.008.164.138.293.301.293.164 0 .293-.129.301-.293l.058-3.048-.058-3.124c-.008-.164-.137-.294-.301-.294zm1.415-.076c-.177 0-.318.14-.326.318l-.029 3.2.029 3.123c.008.178.149.317.326.317.178 0 .318-.139.326-.317l.033-3.123-.033-3.2c-.008-.178-.148-.318-.326-.318z" />
                </svg>
              )}
            </div>

            {/* Provider Info */}
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-white">{provider.name}</h2>
              {provider.connected && provider.account ? (
                <div className="flex items-center gap-2 mt-1">
                  <CheckCircle className="text-spotify-green" size={16} />
                  <span className="text-neutral-400">
                    Connected as{' '}
                    <span className="text-white">{provider.account.displayName}</span>
                  </span>
                </div>
              ) : (
                <p className="text-neutral-500 mt-1">Not connected</p>
              )}
            </div>

            {/* Action Button */}
            {provider.connected ? (
              <button
                onClick={() => handleDisconnect(provider.id)}
                disabled={disconnectMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors disabled:opacity-50"
              >
                <Unlink size={18} />
                Disconnect
              </button>
            ) : (
              <button
                onClick={() => handleConnect(provider.id)}
                title={`Login with your ${provider.name} account via OAuth`}
                className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-colors ${
                  provider.id === 'spotify'
                    ? 'bg-spotify-green text-white hover:bg-spotify-green/90'
                    : 'bg-soundcloud-orange text-white hover:bg-soundcloud-orange/90'
                }`}
              >
                <LinkIcon size={18} />
                Login & Connect
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Info Box */}
      <div className="mt-8 p-4 bg-neutral-800/50 rounded-lg border border-neutral-700">
        <h3 className="font-medium text-white mb-2">About Provider Connections</h3>
        <ul className="text-sm text-neutral-400 space-y-1">
          <li>• Click "Login & Connect" to log in with your Spotify or SoundCloud account</li>
          <li>• You'll be redirected to the official login page (OAuth 2.0)</li>
          <li>• Your credentials are securely encrypted and stored</li>
          <li>• We only request permissions necessary for playlist management</li>
          <li>• You can disconnect providers at any time</li>
          <li>• Disconnecting will remove access to that provider's playlists</li>
        </ul>
      </div>
    </div>
  );
}
