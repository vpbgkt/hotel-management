'use client';

/**
 * Admin Gallery / Media Management Page
 * 
 * Features:
 *   - Grid view of all uploaded media for the hotel
 *   - Upload single or multiple images
 *   - Filter by category (HOTEL, ROOM, AMENITY, GALLERY)
 *   - Delete images
 *   - Edit alt text
 *   - Drag to reorder (visual only — order stored in metadata)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { useAuth } from '@/lib/auth/auth-context';
import { useTenant } from '@/lib/tenant/tenant-context';
import { toast } from 'sonner';
import {
  Upload,
  Trash2,
  ImageIcon,
  Filter,
  Loader2,
  Plus,
  X,
  Edit3,
  Check,
  ImagePlus,
  Grid3X3,
  LayoutGrid,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface MediaItem {
  id: string;
  url: string;
  filename: string;
  altText: string | null;
  category: string;
  size: number;
  mimeType: string;
  createdAt: string;
}

const CATEGORIES = ['ALL', 'HOTEL', 'ROOM', 'AMENITY', 'GALLERY'] as const;

export default function AdminGalleryPage() {
  const { accessToken: token } = useAuth();
  const { hotel } = useTenant();
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [editingAltText, setEditingAltText] = useState<string | null>(null);
  const [altTextValue, setAltTextValue] = useState('');
  const [gridSize, setGridSize] = useState<'sm' | 'lg'>('lg');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hotelId = hotel?.id;

  // Fetch media
  const fetchMedia = useCallback(async () => {
    if (!hotelId) return;
    setLoading(true);
    try {
      const categoryParam = selectedCategory !== 'ALL' ? `?category=${selectedCategory}` : '';
      const res = await fetch(`${API_URL}/api/upload/media/${hotelId}${categoryParam}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setMedia(Array.isArray(data) ? data : data.media || []);
      }
    } catch (err) {
      console.error('Failed to fetch media:', err);
    } finally {
      setLoading(false);
    }
  }, [hotelId, selectedCategory, token]);

  useEffect(() => {
    fetchMedia();
  }, [fetchMedia]);

  // Handle file upload
  const handleUpload = async (files: FileList | File[]) => {
    if (!hotelId || !files.length) return;
    
    setUploading(true);
    const category = selectedCategory === 'ALL' ? 'GALLERY' : selectedCategory;
    
    try {
      if (files.length === 1) {
        const formData = new FormData();
        formData.append('file', files[0]);
        
        const res = await fetch(
          `${API_URL}/api/upload/image?hotelId=${hotelId}&category=${category}`,
          {
            method: 'POST',
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            body: formData,
          }
        );
        
        if (!res.ok) throw new Error('Upload failed');
        toast.success('Image uploaded successfully');
      } else {
        const formData = new FormData();
        Array.from(files).forEach((file) => formData.append('files', file));
        
        const res = await fetch(
          `${API_URL}/api/upload/images?hotelId=${hotelId}&category=${category}`,
          {
            method: 'POST',
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            body: formData,
          }
        );
        
        if (!res.ok) throw new Error('Upload failed');
        toast.success(`${files.length} images uploaded successfully`);
      }
      
      await fetchMedia();
    } catch (err) {
      toast.error('Failed to upload image(s)');
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  // Handle delete
  const handleDelete = async (mediaId: string) => {
    if (!hotelId) return;
    if (!confirm('Delete this image? This action cannot be undone.')) return;
    
    try {
      const res = await fetch(
        `${API_URL}/api/upload/media/${mediaId}?hotelId=${hotelId}`,
        {
          method: 'DELETE',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );
      
      if (!res.ok) throw new Error('Delete failed');
      
      setMedia(media.filter((m) => m.id !== mediaId));
      setSelectedItems((prev) => {
        const next = new Set(prev);
        next.delete(mediaId);
        return next;
      });
      toast.success('Image deleted');
    } catch (err) {
      toast.error('Failed to delete image');
    }
  };

  // Bulk delete
  const handleBulkDelete = async () => {
    if (selectedItems.size === 0) return;
    if (!confirm(`Delete ${selectedItems.size} selected images? This cannot be undone.`)) return;
    
    for (const id of selectedItems) {
      await handleDelete(id);
    }
    setSelectedItems(new Set());
  };

  // Toggle item selection
  const toggleSelect = (id: string) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Drag and drop support
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      handleUpload(e.dataTransfer.files);
    }
  };

  // Filter for display
  const filteredMedia = selectedCategory === 'ALL'
    ? media
    : media.filter((m) => m.category === selectedCategory);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gallery & Media</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage hotel images and media assets ({filteredMedia.length} items)
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {selectedItems.size > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBulkDelete}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Delete ({selectedItems.size})
            </Button>
          )}
          
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <ImagePlus className="w-4 h-4 mr-2" />
            )}
            Upload
          </Button>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && handleUpload(e.target.files)}
          />
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                selectedCategory === cat
                  ? 'bg-brand-100 text-brand-700 font-medium'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat === 'ALL' ? 'All' : cat.charAt(0) + cat.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
        
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setGridSize('lg')}
            className={`p-1.5 rounded ${gridSize === 'lg' ? 'bg-white shadow-sm' : ''}`}
          >
            <LayoutGrid className="w-4 h-4 text-gray-600" />
          </button>
          <button
            onClick={() => setGridSize('sm')}
            className={`p-1.5 rounded ${gridSize === 'sm' ? 'bg-white shadow-sm' : ''}`}
          >
            <Grid3X3 className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Drop Zone / Upload Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-xl p-8 text-center transition-colors
          ${dragOver ? 'border-brand-500 bg-brand-50' : 'border-gray-200 bg-gray-50'}
          ${uploading ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}
        `}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className={`w-8 h-8 mx-auto mb-3 ${dragOver ? 'text-brand-500' : 'text-gray-400'}`} />
        <p className="text-sm text-gray-600 font-medium">
          {dragOver ? 'Drop images here' : 'Drag & drop images here, or click to browse'}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Supports JPG, PNG, WebP up to 10MB per file. Max 10 files at once.
        </p>
      </div>

      {/* Media Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : filteredMedia.length === 0 ? (
        <div className="text-center py-16">
          <ImageIcon className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No images yet</p>
          <p className="text-sm text-gray-400 mt-1">Upload your first image to get started</p>
        </div>
      ) : (
        <div className={`grid gap-4 ${
          gridSize === 'lg' 
            ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4' 
            : 'grid-cols-3 md:grid-cols-5 lg:grid-cols-6'
        }`}>
          {filteredMedia.map((item) => (
            <div
              key={item.id}
              className={`group relative rounded-xl overflow-hidden border-2 transition-all ${
                selectedItems.has(item.id)
                  ? 'border-brand-500 ring-2 ring-brand-200'
                  : 'border-transparent hover:border-gray-200'
              }`}
            >
              {/* Image */}
              <div className={`relative bg-gray-100 ${gridSize === 'lg' ? 'aspect-[4/3]' : 'aspect-square'}`}>
                <Image
                  src={item.url.startsWith('http') ? item.url : `${API_URL}${item.url}`}
                  alt={item.altText || item.filename}
                  fill
                  className="object-cover"
                  sizes={gridSize === 'lg' ? '(max-width: 768px) 50vw, 25vw' : '(max-width: 768px) 33vw, 16vw'}
                />
                
                {/* Overlay actions */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors">
                  <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelect(item.id);
                      }}
                      className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                        selectedItems.has(item.id)
                          ? 'bg-brand-600 border-brand-600'
                          : 'bg-white/80 border-white'
                      }`}
                    >
                      {selectedItems.has(item.id) && (
                        <Check className="w-4 h-4 text-white" />
                      )}
                    </button>
                  </div>
                  
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingAltText(item.id);
                        setAltTextValue(item.altText || '');
                      }}
                      className="w-7 h-7 rounded-full bg-white/90 flex items-center justify-center hover:bg-white"
                      title="Edit alt text"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-gray-700" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(item.id);
                      }}
                      className="w-7 h-7 rounded-full bg-white/90 flex items-center justify-center hover:bg-red-50"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-600" />
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Info */}
              {gridSize === 'lg' && (
                <div className="p-2.5">
                  {editingAltText === item.id ? (
                    <div className="flex gap-1">
                      <input
                        type="text"
                        value={altTextValue}
                        onChange={(e) => setAltTextValue(e.target.value)}
                        placeholder="Alt text..."
                        className="flex-1 text-xs border border-gray-200 rounded px-2 py-1 focus:ring-1 focus:ring-brand-500"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') setEditingAltText(null);
                          if (e.key === 'Escape') setEditingAltText(null);
                        }}
                      />
                      <button
                        onClick={() => setEditingAltText(null)}
                        className="p-1 text-green-600"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <p className="text-xs text-gray-700 truncate" title={item.filename}>
                        {item.filename}
                      </p>
                      <div className="flex items-center justify-between mt-1">
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          {item.category}
                        </Badge>
                        <span className="text-[10px] text-gray-400">
                          {formatFileSize(item.size)}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
          
          {/* Add More Card */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center
              text-gray-400 hover:text-brand-500 hover:border-brand-300 transition-colors
              ${gridSize === 'lg' ? 'aspect-[4/3]' : 'aspect-square'}
            `}
          >
            <Plus className="w-8 h-8 mb-1" />
            <span className="text-xs">Add more</span>
          </button>
        </div>
      )}
    </div>
  );
}
