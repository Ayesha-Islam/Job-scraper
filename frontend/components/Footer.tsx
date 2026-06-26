import { ArrowRight, Briefcase } from "lucide-react";

export default function Footer() {
  return (
    <footer className=" py-12 px-6 bg-background text-foreground">
      <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-8">
        <div>
          <h3 className="font-bold mb-4">Get the latest update</h3>
          <a href="#" className=" hover:text-primary-foreground flex items-center gap-2">
            get in touch <ArrowRight className="w-4 h-4" />
          </a>
        </div>
        <div>
          <h3 className="font-bold mb-4">JobScraper & Co.</h3>
          <ul className="space-y-2">
            <li><a href="#" className="hover:text-primary-foreground">Discover Jobs</a></li>
            <li><a href="#" className="hover:text-primary-foreground">Help Center</a></li>
            <li><a href="#" className="hover:text-primary-foreground">About Us</a></li>
          </ul>
        </div>
        <div>
          <h3 className="font-bold mb-4">Connect</h3>
          <ul className="space-y-2">
            <li><a href="#" className="hover:text-primary-foreground">LinkedIn</a></li>
            <li><a href="#" className="hover:text-primary-foreground">Twitter</a></li>
            <li><a href="#" className="hover:text-primary-foreground">Instagram</a></li>
          </ul>
        </div>
      </div>

      <div className="max-w-7xl mx-auto mt-12 pt-8 border-t border-border flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-card rounded flex items-center justify-center">
            <Briefcase className="w-4 h-4 text-foreground" />
          </div>
          <span className="font-bold ">JobScraper & Co.</span>
        </div>
        <div className="text-sm">
          © 2026 JobScraper & Co. All rights reserved.
        </div>
      </div>
    </footer>
  );
}