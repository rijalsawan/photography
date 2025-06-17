"use client"
import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

const Page = () => {
    const [selectedPhoto, setSelectedPhoto] = useState<number | null>(null)
    const [photos, setPhotos] = useState([] as { id: number, url: string }[])

    const fetchPhotos = async () => {
        try {
            const response = await fetch('/api/getphotos');
            if (!response.ok) {
                throw new Error('Failed to fetch photos');
            }
            const data = await response.json();
            console.log('Fetched photos:', data);
            
            setPhotos(data);
        } catch (error) {
            console.error('Error fetching photos:', error);
        }
    }

    React.useEffect(() => {
        fetchPhotos();
    }, []);

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-20 px-4">
            <div className="max-w-7xl mx-auto">
                <motion.div 
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="text-center mb-20"
                >
                    <h1 className="text-5xl font-extralight text-gray-900 mb-6 tracking-wide">My Photos</h1>
                    <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: 96 }}
                        transition={{ delay: 0.5, duration: 0.8 }}
                        className="h-px bg-gradient-to-r from-transparent via-gray-400 to-transparent mx-auto"
                    />
                </motion.div>
                
                <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
                    {photos.map((photo, index) => (
                        <motion.div
                            key={photo.id}
                            initial={{ opacity: 0, y: 50 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1, duration: 0.6 }}
                            whileHover={{ y: -5, scale: 1.02 }}
                            className="group cursor-pointer break-inside-avoid mb-6 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden bg-white"
                            onClick={() => setSelectedPhoto(photo.id)}
                        >
                            <div className="relative overflow-hidden">
                                <img
                                    src={photo.url}
                                    className="w-full h-auto object-cover transition-all duration-700 group-hover:scale-105 group-hover:brightness-110"
                                    loading="lazy"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-all duration-500" />
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Lightbox Modal */}
            <AnimatePresence>
                {selectedPhoto && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
                        onClick={() => setSelectedPhoto(null)}
                    >
                        <motion.button
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="absolute top-6 right-6 text-white hover:text-gray-300 transition-colors z-10"
                            onClick={() => setSelectedPhoto(null)}
                        >
                            <X size={32} />
                        </motion.button>
                        
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            className="relative w-full h-full flex items-center justify-center"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <img
                                src={photos.find(p => p.id === selectedPhoto)?.url || ''}
                                className="max-w-[90vw] max-h-[90vh] w-auto h-auto object-contain rounded-lg shadow-2xl"
                            />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

export default Page
