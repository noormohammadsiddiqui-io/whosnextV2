'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { subscribeToOnlineUsersCount } from '../../lib/socket';

export default function HomePage() {
  const [onlineUsers, setOnlineUsers] = useState(0);
  
  useEffect(() => {
    // Import socket and connect it
    import('../../lib/socket').then(({ default: socket }) => {
      if (socket && !socket.connected) {
        console.log('Connecting socket from homepage');
        socket.connect();
      }
    });

    // Subscribe to online users count updates
    const unsubscribe = subscribeToOnlineUsersCount((count) => {
      console.log('Homepage received user count update:', count);
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
          WhosNext - Best Omegle Alternative
        </h1>
        
        <p className="text-xl mb-4 text-gray-700 max-w-2xl mx-auto">
          The #1 Omegle alternative for random video chat. Connect instantly with strangers from around the world. 
          Completely free, no registration required, and safer than Omegle with better video quality!
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
            <h3 className="text-xl font-bold mb-2">Safer Than Omegle</h3>
            <p className="text-gray-600">Better moderation and security features. Your conversations are private and never recorded or stored.</p>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-300">
            <div className="text-blue-600 text-4xl mb-4">🌐</div>
            <h3 className="text-xl font-bold mb-2">Best Omegle Alternative</h3>
            <p className="text-gray-600">Superior to Omegle with HD video quality, faster connections, and users from 190+ countries.</p>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-300">
            <div className="text-blue-600 text-4xl mb-4">⚡</div>
            <h3 className="text-xl font-bold mb-2">Free Random Video Chat</h3>
            <p className="text-gray-600">100% free forever. No hidden fees, no registration required. Start chatting with strangers instantly.</p>
          </div>
        </div>
        
        {/* SEO Content Section */}
        <div className="mt-16 max-w-4xl mx-auto text-left bg-white p-8 rounded-xl shadow-md">
          <h2 className="text-3xl font-bold mb-6 text-gray-800">Why WhosNext is the Best Omegle Alternative</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xl font-semibold mb-3 text-blue-600">Better Than Omegle</h3>
              <ul className="space-y-2 text-gray-700">
                <li>• HD video quality (1080p vs Omegle's 720p)</li>
                <li>• Faster connection speeds</li>
                <li>• Better mobile experience</li>
                <li>• Advanced spam protection</li>
                <li>• No ads interrupting your chats</li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-xl font-semibold mb-3 text-blue-600">Safe & Secure</h3>
              <ul className="space-y-2 text-gray-700">
                <li>• Enhanced moderation system</li>
                <li>• Report and block features</li>
                <li>• No chat logs stored</li>
                <li>• Anonymous connections</li>
                <li>• GDPR compliant</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-8">
            <h3 className="text-xl font-semibold mb-3 text-blue-600">Free Random Video Chat Features</h3>
            <p className="text-gray-700 leading-relaxed">
              WhosNext offers the best free random video chat experience online. Unlike other Omegle alternatives, 
              we provide crystal-clear HD video, instant connections, and a user-friendly interface that works 
              perfectly on desktop and mobile devices. Connect with millions of users worldwide for free random 
              video chats, text conversations, and make new friends from different cultures and countries.
            </p>
          </div>
        </div>
      </div>
      
      <footer className="mt-16 text-center text-gray-600">
        <p>© {new Date().getFullYear()} WhosNext. All rights reserved.</p>
      </footer>
    </div>
  );
}