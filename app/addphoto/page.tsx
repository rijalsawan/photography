'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
    Upload, 
    Camera, 
    X, 
    Image, 
    MapPin, 
    Tag, 
    Type, 
    Check,
    ArrowLeft,
    Loader2,
    Plus,
    Eye,
    Users,
    Lock,
    ChevronDown
} from 'lucide-react'
import { useUser } from '@clerk/nextjs'
import toast from 'react-hot-toast'

export default function AddPhotoPage() {
    const { user: clerkUser } = useUser()
    const [file, setFile] = useState<File | null>(null)
    const [uploading, setUploading] = useState(false)
    const [preview, setPreview] = useState<string | null>(null)
    const [uploadProgress, setUploadProgress] = useState<string>('')
    const [step, setStep] = useState<'upload' | 'details'>('upload')
    const [photoDetails, setPhotoDetails] = useState({
        title: '',
        description: '',
        location: '',
        tags: '',
        isPrivate: false
    })
    const [dragActive, setDragActive] = useState(false)
    const router = useRouter()

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0]
        if (selectedFile) {
            handleFile(selectedFile)
        }
    }

    const handleFile = (selectedFile: File) => {
        if (!selectedFile.type.startsWith('image/')) {
            toast.error('Please select a valid image file')
            return
        }

        if (selectedFile.size > 10 * 1024 * 1024) {
            toast.error('File size must be less than 10MB')
            return
        }

        setFile(selectedFile)
        const reader = new FileReader()
        reader.onload = () => setPreview(reader.result as string)
        reader.readAsDataURL(selectedFile)
    }

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true)
        } else if (e.type === 'dragleave') {
            setDragActive(false)
        }
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setDragActive(false)

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0])
        }
    }

    const handleNext = () => {
        if (!file) {
            toast.error('Please select a photo first')
            return
        }
        setStep('details')
    }

    const handleBack = () => {
        setStep('upload')
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!file) return

        setUploading(true)
        setUploadProgress('Uploading...')
        
        try {
            const formData = new FormData()
            formData.append('file', file)

            const cloudinaryResponse = await fetch('/api/addphotocloud', {
                method: 'POST',
                body: formData,
            })

            if (!cloudinaryResponse.ok) {
                throw new Error('Failed to upload to Cloudinary')
            }

            const cloudinaryData = await cloudinaryResponse.json()

            const dbResponse = await fetch('/api/addPhoto', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    url: cloudinaryData.url,
                    title: photoDetails.title,
                    description: photoDetails.description,
                    location: photoDetails.location,
                    tags: photoDetails.tags,
                    isPrivate: photoDetails.isPrivate
                }),
            })

            if (!dbResponse.ok) {
                throw new Error('Failed to save to database')
            }

            toast.success('Photo shared!')
            
            setFile(null)
            setPreview(null)
            setPhotoDetails({
                title: '',
                description: '',
                location: '',
                tags: '',
                isPrivate: false
            })
            setStep('upload')

            setTimeout(() => {
                router.push('/')
            }, 1500)

        } catch (error) {
            console.error('Error uploading photo:', error)
            toast.error('Failed to share photo')
        } finally {
            setTimeout(() => {
                setUploading(false)
                setUploadProgress('')
            }, 2000)
        }
    }

    const handleRemoveFile = () => {
        setFile(null)
        setPreview(null)
        setStep('upload')
    }

    return (
        <div className="min-h-screen bg-white">
            {/* Instagram-style Header */}
            <div className="sticky top-0 z-50 bg-white border-b border-gray-200">
                <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center">
                        <button
                            onClick={() => router.push('/')}
                            className="p-2"
                        >
                            <ArrowLeft className="w-6 h-6" />
                        </button>
                        <h1 className="text-lg font-semibold ml-2">
                            {step === 'upload' ? 'New Post' : 'Share'}
                        </h1>
                    </div>
                    {step === 'details' && (
                        <button
                            onClick={handleSubmit}
                            disabled={!file || uploading}
                            className="text-blue-500 font-semibold disabled:opacity-50"
                        >
                            {uploading ? 'Sharing...' : 'Share'}
                        </button>
                    )}
                </div>
            </div>

            <AnimatePresence mode="wait">
                {step === 'upload' && (
                    <motion.div
                        key="upload"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="h-screen"
                    >
                        {!preview ? (
                            <div className="flex flex-col items-center justify-center mt-20 px-6">
                                <div
                                    className={`w-full max-w-sm aspect-square border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
                                        dragActive 
                                            ? 'border-blue-500 bg-blue-50' 
                                            : 'border-gray-300'
                                    }`}
                                    onDragEnter={handleDrag}
                                    onDragLeave={handleDrag}
                                    onDragOver={handleDrag}
                                    onDrop={handleDrop}
                                >
                                    <div className="flex flex-col items-center justify-center h-full space-y-4">
                                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                                            <Camera className="w-8 h-8 text-gray-400" />
                                        </div>
                                        <div>
                                            <p className="text-xl font-light text-gray-900 mb-2">
                                                Share a photo
                                            </p>
                                            <p className="text-gray-500 text-sm mb-4">
                                                Select from your gallery
                                            </p>
                                        </div>
                                        <label className="cursor-pointer">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleFileChange}
                                                className="hidden"
                                            />
                                            <div className="bg-blue-500 text-white px-8 py-2 rounded-lg font-medium hover:bg-blue-600 transition-colors">
                                                Select Photo
                                            </div>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col lg:w-1/2 lg:mx-auto max-sm:my-10 lg:my-24">
                                {/* Image Preview */}
                                <div className="lg:w-50 lg:mx-auto bg-black flex items-center justify-center">
                                    <div className="relative w-full h-full max-w-md max-h-96">
                                        <img
                                            src={preview || ''}
                                            alt="Preview"
                                            className="w-full h-full object-contain"
                                        />
                                    </div>
                                </div>
                                
                                {/* Bottom Actions */}
                                <div className="bg-white p-4 border-t border-gray-200">
                                    <div className="flex gap-3">
                                        <button
                                            onClick={handleRemoveFile}
                                            className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium"
                                        >
                                            Choose Different
                                        </button>
                                        <button
                                            onClick={handleNext}
                                            className="flex-1 py-3 bg-blue-500 text-white rounded-lg font-medium"
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}

                {step === 'details' && (
                    <motion.div
                        key="details"
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -50 }}
                        className="min-h-screen lg:w-1/2 lg:mx-auto lg:my-20"
                    >
                        <form onSubmit={handleSubmit} className="h-full">
                            {/* Post Preview */}
                            <div className="bg-white border-b border-gray-200 p-4">
                                <div className="flex gap-3">
                                    <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center overflow-hidden">
                                        {clerkUser?.imageUrl ? (
                                            <img src={clerkUser.imageUrl} alt="Avatar" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-br from-purple-400 to-pink-400" />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-semibold text-sm">{clerkUser?.username || 'You'}</p>
                                        <textarea
                                            value={photoDetails.description}
                                            onChange={(e) => setPhotoDetails(prev => ({ ...prev, description: e.target.value }))}
                                            placeholder="Write a caption..."
                                            className="w-full mt-2 text-sm resize-none border-none outline-none placeholder-gray-400"
                                            rows={3}
                                        />
                                    </div>
                                    <div className="w-11 h-11 rounded-lg overflow-hidden bg-gray-100">
                                        {preview && (
                                            <img
                                                src={preview}
                                                alt="Preview"
                                                className="w-full h-full object-cover"
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Options */}
                            <div className="bg-white">
                                {/* Add Location */}
                                <div className="border-b border-gray-200 p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <MapPin className="w-6 h-6 text-gray-400" />
                                            <input
                                                type="text"
                                                value={photoDetails.location}
                                                onChange={(e) => setPhotoDetails(prev => ({ ...prev, location: e.target.value }))}
                                                placeholder="Add location"
                                                className="text-sm outline-none placeholder-gray-400"
                                            />
                                        </div>
                                        <ChevronDown className="w-5 h-5 text-gray-400" />
                                    </div>
                                </div>

                                {/* Tag People */}
                                <div className="border-b border-gray-200 p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Users className="w-6 h-6 text-gray-400" />
                                            <input
                                                type="text"
                                                value={photoDetails.tags}
                                                onChange={(e) => setPhotoDetails(prev => ({ ...prev, tags: e.target.value }))}
                                                placeholder="Tag people or add hashtags"
                                                className="text-sm outline-none placeholder-gray-400"
                                            />
                                        </div>
                                        <ChevronDown className="w-5 h-5 text-gray-400" />
                                    </div>
                                </div>

                                {/* Accessibility */}
                                <div className="border-b border-gray-200 p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Type className="w-6 h-6 text-gray-400" />
                                            <input
                                                type="text"
                                                value={photoDetails.title}
                                                onChange={(e) => setPhotoDetails(prev => ({ ...prev, title: e.target.value }))}
                                                placeholder="Write alt text"
                                                className="text-sm outline-none placeholder-gray-400"
                                            />
                                        </div>
                                        <ChevronDown className="w-5 h-5 text-gray-400" />
                                    </div>
                                </div>

                                {/* Advanced Settings */}
                                <div className="p-4">
                                    <h3 className="text-lg font-semibold mb-4">Advanced settings</h3>
                                    
                                    <div className="flex items-center justify-between py-3">
                                        <span className="text-sm">Hide like and view counts on this post</span>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={photoDetails.isPrivate}
                                                onChange={(e) => setPhotoDetails(prev => ({ ...prev, isPrivate: e.target.checked }))}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* Loading State */}
                            {uploadProgress && (
                                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                                    <div className="bg-white rounded-lg p-6 flex items-center gap-3">
                                        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                                        <span className="font-medium">{uploadProgress}</span>
                                    </div>
                                </div>
                            )}
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
