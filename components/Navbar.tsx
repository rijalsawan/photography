'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'


const Navbar = () => {
    const [scrolled, setScrolled] = useState(false)

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 50)
        }
        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    const navItems = [
        { name: 'About', href: '#' },
        { name: 'Contact', href: '#' }
    ]

    return (
        <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ease-in-out ${
            scrolled ? 'bg-white/90 backdrop-blur-md shadow-sm' : 'bg-transparent'
        }`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    {/* Logo */}
                    <Link href="/" className="text-xl font-bold text-gray-900 hover:text-gray-700 transition-colors">
                        Sawan Rijal
                    </Link>

                    {/* Desktop Menu */}
                    <div className="hidden md:flex space-x-8">
                        {navItems.map((item) => (
                            <Link
                                key={item.name}
                                href={item.href}
                                className="text-gray-700 hover:text-gray-900 px-3 py-2 text-sm font-medium transition-colors duration-200 relative group"
                            >
                                {item.name}
                                <span className="absolute inset-x-0 bottom-0 h-0.5 bg-gray-900 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-200 origin-left"></span>
                            </Link>
                        ))}
                    </div>

                    
                </div>
            </div>
        </nav>
    )
}

export default Navbar