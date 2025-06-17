'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AddPhotoPage() {
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [preview, setPreview] = useState<string | null>(null);
    const [uploadProgress, setUploadProgress] = useState<string>('');
    const router = useRouter();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            const reader = new FileReader();
            reader.onload = () => setPreview(reader.result as string);
            reader.readAsDataURL(selectedFile);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) return;

        setUploading(true);
        setUploadProgress('Uploading to cloud...');
        
        try {
            // First, upload to Cloudinary
            const formData = new FormData();
            formData.append('file', file);

            const cloudinaryResponse = await fetch('/api/addphotocloud', {
                method: 'POST',
                body: formData,
            });

            if (!cloudinaryResponse.ok) {
                throw new Error('Failed to upload to Cloudinary');
            }

            const cloudinaryData = await cloudinaryResponse.json();
            setUploadProgress('Saving to database...');

            // Then, save URL to database
            const dbResponse = await fetch('/api/addPhoto', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url: cloudinaryData.url }),
            });

            if (!dbResponse.ok) {
                throw new Error('Failed to save to database');
            }

            setUploadProgress('Success!');
            setFile(null);
            setPreview(null);

        } catch (error) {
            console.error('Error uploading photo:', error);
            setUploadProgress('Upload failed');
        } finally {
            setTimeout(() => {
                setUploading(false);
                setUploadProgress('');
            }, 2000);
        }
    };

    const handleRemoveFile = () => {
        setFile(null);
        setPreview(null);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4">
            <div className="max-w-2xl mx-auto">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-light text-gray-900 mb-2">Add New Photo</h1>
                    <p className="text-gray-600">Upload your photo to the gallery</p>
                </div>
                
                <div className="bg-white rounded-2xl shadow-xl p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {!preview ? (
                            <div className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-gray-400 transition-colors">
                                <div className="space-y-4">
                                    <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                        </svg>
                                    </div>
                                    <div>
                                        <label className="cursor-pointer">
                                            <span className="text-lg font-medium text-gray-700">Choose a photo</span>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleFileChange}
                                                className="hidden"
                                                required
                                            />
                                        </label>
                                        <p className="text-sm text-gray-500 mt-1">PNG, JPG, GIF up to 10MB</p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="relative group">
                                    <img
                                        src={preview}
                                        alt="Preview"
                                        className="w-full h-64 object-cover rounded-xl"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleRemoveFile}
                                        className="absolute top-3 right-3 bg-white/80 hover:bg-white text-gray-600 hover:text-gray-800 rounded-full p-2 shadow-lg transition-all opacity-0 group-hover:opacity-100"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                                <div className="text-center">
                                    <p className="text-sm text-gray-600">{file?.name}</p>
                                    <p className="text-xs text-gray-500">{file?.size ? (file.size / 1024 / 1024).toFixed(2) : '0'} MB</p>
                                </div>
                            </div>
                        )}

                        {uploadProgress && (
                            <div className="text-center">
                                <div className="inline-flex items-center space-x-2 text-sm text-gray-600">
                                    {uploading && (
                                        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                    )}
                                    <span>{uploadProgress}</span>
                                </div>
                            </div>
                        )}

                        <div className="flex space-x-4">
                            <button
                                type="button"
                                onClick={() => router.push('/')}
                                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={!file || uploading}
                                className="flex-1 px-6 py-3 bg-black text-white rounded-xl hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
                            >
                                {uploading ? 'Uploading...' : 'Upload Photo'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}