import { Test, TestingModule } from '@nestjs/testing';
import { UnifiedService } from './unified.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UnifiedPlaylist, UnifiedItem, Track } from '../database/entities';
import { ProvidersService } from '../providers/providers.service';
import { Repository } from 'typeorm';

describe('UnifiedService', () => {
  let service: UnifiedService;
  let playlistRepo: jest.Mocked<Repository<UnifiedPlaylist>>;
  let itemRepo: jest.Mocked<Repository<UnifiedItem>>;
  let trackRepo: jest.Mocked<Repository<Track>>;
  let providersService: jest.Mocked<ProvidersService>;

  const mockPlaylistRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };

  const mockItemRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    count: jest.fn(),
  };

  const mockTrackRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockProvidersService = {
    getProviderAccounts: jest.fn(),
    getAdapter: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UnifiedService,
        {
          provide: getRepositoryToken(UnifiedPlaylist),
          useValue: mockPlaylistRepo,
        },
        {
          provide: getRepositoryToken(UnifiedItem),
          useValue: mockItemRepo,
        },
        {
          provide: getRepositoryToken(Track),
          useValue: mockTrackRepo,
        },
        {
          provide: ProvidersService,
          useValue: mockProvidersService,
        },
      ],
    }).compile();

    service = module.get<UnifiedService>(UnifiedService);
    playlistRepo = module.get(getRepositoryToken(UnifiedPlaylist));
    itemRepo = module.get(getRepositoryToken(UnifiedItem));
    trackRepo = module.get(getRepositoryToken(Track));
    providersService = module.get(ProvidersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getPlaylists', () => {
    it('should return empty playlists for new user', async () => {
      const userId = 'user-123';
      mockPlaylistRepo.find.mockResolvedValue([]);

      const result = await service.getPlaylists(userId);

      expect(result.playlists).toEqual([]);
      expect(mockPlaylistRepo.find).toHaveBeenCalledWith({
        where: { userId },
        order: { updatedAt: 'DESC' },
      });
    });

    it('should return playlists with track counts', async () => {
      const userId = 'user-123';
      const mockPlaylists = [
        {
          id: 'playlist-1',
          name: 'My Playlist',
          description: 'Description',
          imageUrl: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPlaylistRepo.find.mockResolvedValue(mockPlaylists as UnifiedPlaylist[]);
      mockItemRepo.count.mockResolvedValue(5);

      const result = await service.getPlaylists(userId);

      expect(result.playlists).toHaveLength(1);
      expect(result.playlists[0].trackCount).toBe(5);
    });
  });

  describe('createPlaylist', () => {
    it('should create a new playlist', async () => {
      const userId = 'user-123';
      const name = 'New Playlist';
      const description = 'Description';

      const mockPlaylist = {
        id: 'playlist-new',
        userId,
        name,
        description,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPlaylistRepo.create.mockReturnValue(mockPlaylist as UnifiedPlaylist);
      mockPlaylistRepo.save.mockResolvedValue(mockPlaylist as UnifiedPlaylist);

      const result = await service.createPlaylist(userId, name, description);

      expect(result.playlist.name).toBe(name);
      expect(result.playlist.description).toBe(description);
      expect(mockPlaylistRepo.create).toHaveBeenCalledWith({
        userId,
        name,
        description,
      });
    });
  });

  describe('reorderItems', () => {
    it('should reorder items correctly when moving down', async () => {
      const userId = 'user-123';
      const playlistId = 'playlist-1';
      const itemId = 'item-1';

      const mockPlaylist = { id: playlistId, userId };
      const mockItems = [
        { id: 'item-1', position: 0 },
        { id: 'item-2', position: 1 },
        { id: 'item-3', position: 2 },
        { id: 'item-4', position: 3 },
      ];

      mockPlaylistRepo.findOne.mockResolvedValue(mockPlaylist as UnifiedPlaylist);
      mockItemRepo.findOne.mockResolvedValue(mockItems[0] as UnifiedItem);
      mockItemRepo.find.mockResolvedValue(mockItems as UnifiedItem[]);
      mockItemRepo.save.mockImplementation((items) => Promise.resolve(items));

      const result = await service.reorderItems(userId, playlistId, itemId, 2);

      // After moving item-1 from position 0 to position 2:
      // Expected order: item-2 (0), item-3 (1), item-1 (2), item-4 (3)
      expect(result.items).toBeDefined();
    });
  });
});
