import { ArrowRight, Briefcase } from "lucide-react";

export default function Footer() {
  return (
     <footer className="bg-slate-950 py-12 px-6 bg-white">
            <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-8">
              <div>
                <h3 className="font-bold mb-4">Get the latest update</h3>
                <a href="#" className="text-black hover:text-black flex items-center gap-2">
                  get in touch <ArrowRight className="w-4 h-4" />
                </a>
              </div>
              <div>
                <h3 className="font-bold mb-4">JobScraper & Co.</h3>
                <ul className="space-y-2 text-black">
                  <li><a href="#" className="hover:text-black">Discover Jobs</a></li>
                  <li><a href="#" className="hover:text-black">Help Center</a></li>
                  <li><a href="#" className="hover:text-black">About Us</a></li>
                </ul>
              </div>
              <div>
                <h3 className="font-bold mb-4">Connect</h3>
                <ul className="space-y-2 text-black">
                  <li><a href="#" className="hover:text-black">LinkedIn</a></li>
                  <li><a href="#" className="hover:text-black">Twitter</a></li>
                  <li><a href="#" className="hover:text-black">Instagram</a></li>
                </ul>
              </div>
            </div>
    
            <div className="max-w-7xl mx-auto mt-12 pt-8 border-t border-slate-800 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-black rounded flex items-center justify-center">
                  <Briefcase className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-black">JobScraper & Co.</span>
              </div>
              <div className="text-sm text-black">
                © 2026 JobScraper & Co. All rights reserved.
              </div>
            </div>
          </footer>
    // <footer className="relative   bg-concentric-grid text-white">
    //   <div className="max-w-7xl mx-auto px-6 lg:px-8 py-10">
    //     <div className="grid md:grid-cols-3 gap-12">
    //       <div>
    //         <h3 className="text-xl font-bold mb-6 text-white">Get the latest update</h3>
    //         <a href="/contact">
    //           <button className="text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-2 group">
    //             <span className="border-b border-purple-400 group-hover:border-purple-300">get in touch</span>
    //             <ArrowRight className="w-4 h-4" />
    //           </button>
    //         </a>
    //       </div>

    //       <div>
    //         <h3 className="text-xl font-bold mb-6 text-white">JobScraper & Co.</h3>
    //         <ul className="space-y-3 text-gray-400">
    //           <li><a href="/jobs" className="hover:text-white transition-colors">Discover Jobs</a></li>
    //           <li><a href="/about" className="hover:text-white transition-colors">Help Center</a></li>
    //           <li><a href="/about" className="hover:text-white transition-colors">About Us</a></li>
    //         </ul>
    //       </div>

    //       <div>
    //         <h3 className="text-xl font-bold mb-6 text-white">Connect</h3>
    //         <ul className="space-y-3 text-gray-400">
    //           <li><a href="#" className="hover:text-white transition-colors">LinkedIn</a></li>
    //           <li><a href="#" className="hover:text-white transition-colors">Twitter</a></li>
    //           <li><a href="#" className="hover:text-white transition-colors">Instagram</a></li>
    //         </ul>
    //       </div>
    //     </div>

    //     <div className="mt-16 pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center gap-4">
    //       <div className="flex items-center gap-3">
    //         <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-lg flex items-center justify-center">
    //           <Briefcase className="w-5 h-5 text-white" />
    //         </div>
    //         <span className="text-xl font-bold text-white">JobScraper & Co.</span>
    //       </div>
    //       <p className="text-gray-500 text-sm">
    //         © 2026 JobScraper & Co. All rights reserved.
    //       </p>
    //     </div>
    //   </div>
    // </footer>
  );
}