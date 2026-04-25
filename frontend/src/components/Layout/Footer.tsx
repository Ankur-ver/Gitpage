import React from 'react';
import { Link } from 'react-router-dom';

const Footer: React.FC = () => {
  const links = [
    { group: 'Product',  items: ['Features','Security','Enterprise','Case Studies','Pricing','Resources'] },
    { group: 'Platform', items: ['Developer API','Partners','Atom','Electron','GitPage Desktop'] },
    { group: 'Support',  items: ['Docs','Community Forum','Professional Services','Skills','Status'] },
    { group: 'Company',  items: ['About','Blog','Careers','Press','Inclusion','Social Impact','Shop'] },
  ];

  return (
    <footer className="bg-bg-secondary border-t border-[#2a2a3a] mt-20">
      <div className="max-w-screen-xl mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          {links.map(group => (
            <div key={group.group}>
              <h4 className="font-semibold text-text-primary text-sm mb-4">{group.group}</h4>
              <ul className="space-y-2">
                {group.items.map(item => (
                  <li key={item}>
                    <Link
                      to="#"
                      className="text-text-muted hover:text-text-secondary text-sm transition-colors"
                    >
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between
                        pt-8 border-t border-[#2a2a3a] gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-indigo-500 to-purple-600
                            flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57
                  0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015
                  1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925
                  0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135
                  3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805
                  5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02
                  0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
              </svg>
            </div>
            <span className="text-text-muted text-sm">© 2024 GitPage, Inc.</span>
          </div>
          <div className="flex items-center gap-6">
            {['Terms','Privacy','Security','Contact'].map(item => (
              <Link
                key={item}
                to="#"
                className="text-text-muted hover:text-text-secondary text-sm transition-colors"
              >
                {item}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;