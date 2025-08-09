'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { subscribeToOnlineUsersCount } from '../../lib/socket';

export default function HomePage() {
  const [onlineUsers, setOnlineUsers] = useState(0);
  
  useEffect(() => {
    // Subscribe to online users count updates
    const unsubscribe = subscribeToOnlineUsersCount((count) => {
      setOnlineUsers(count);
    });
    
    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl w-full mx-auto text-center">
        <div className="mb-8 flex justify-center">
          <Image 
            src="/globe.svg" 
            alt="Globe Icon" 
            width={80} 
            height={80} 
            className="animate-pulse"
          />
        </div>
        
        <h1 className="text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
          WhosNext
        </h1>
        
        <p className="text-xl mb-4 text-gray-700 max-w-2xl mx-auto">
          Connect instantly with people from around the world through random video chats. 
          No registration required, just click and discover who's next!
        </p>
        
        <div className="mb-8 bg-blue-100 text-blue-800 py-2 px-4 rounded-full inline-flex items-center">
          <div className="w-3 h-3 bg-green-500 rounded-full mr-2 animate-pulse"></div>
          <span className="font-semibold">{onlineUsers} {onlineUsers === 1 ? 'user' : 'users'} online now</span>
        </div>
        
        <div className="flex flex-col sm:flex-row justify-center gap-4 mb-12">
          <Link 
            href="/chat" 
            className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 text-lg"
          >
            Start Video Chat
          </Link>
          
          <a 
            href="#features" 
            className="px-8 py-4 bg-white text-blue-600 font-bold rounded-lg shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 text-lg"
          >
            Learn More
          </a>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12" id="features">
          <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-300">
            <div className="text-blue-600 text-4xl mb-4">🔒</div>
            <h3 className="text-xl font-bold mb-2">Private & Secure</h3>
            <p className="text-gray-600">Your conversations are never recorded or stored. Connect with confidence.</p>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-300">
            <div className="text-blue-600 text-4xl mb-4">🌐</div>
            <h3 className="text-xl font-bold mb-2">Global Reach</h3>
            <p className="text-gray-600">Connect with people from different countries and cultures instantly.</p>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-300">
            <div className="text-blue-600 text-4xl mb-4">⚡</div>
            <h3 className="text-xl font-bold mb-2">Lightning Fast</h3>
            <p className="text-gray-600">Our WebRTC technology ensures smooth, high-quality video connections.</p>
          </div>
        </div>
      </div>
      
      <footer className="mt-16 text-center text-gray-600">
        <p>© {new Date().getFullYear()} WhosNext. All rights reserved.</p>
      </footer>
    </div>
  );
}