import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, FileText, Users, Package, BookOpen, Utensils, ClipboardCheck } from 'lucide-react';
import { createPageUrl } from '@/utils';

/**
 * Universal Search Component
 * Searches across SOPs, Menu Items, Staff, Documents, Forms
 */
export default function UniversalSearch({ onResultClick }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const { data: sops = [] } = useQuery({
    queryKey: ['sops'],
    queryFn: () => base44.entities.SOPDocument.list(),
  });

  const { data: menuItems = [] } = useQuery({
    queryKey: ['menuItems'],
    queryFn: () => base44.entities.MenuItem.list(),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: documents = [] } = useQuery({
    queryKey: ['documents'],
    queryFn: () => base44.entities.DocumentBuilder.list(),
  });

  const { data: forms = [] } = useQuery({
    queryKey: ['forms'],
    queryFn: () => base44.entities.FormTemplate.list(),
  });

  useEffect(() => {
    if (!searchTerm.trim()) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    const term = searchTerm.toLowerCase();

    const searchResults = [];

    // Search SOPs
    sops.forEach(sop => {
      if (sop.title?.toLowerCase().includes(term) || sop.description?.toLowerCase().includes(term)) {
        searchResults.push({
          type: 'sop',
          id: sop.id,
          title: sop.title,
          subtitle: sop.category,
          url: createPageUrl(`SOPViewer?id=${sop.id}`),
          icon: BookOpen,
          color: 'purple',
        });
      }
    });

    // Search Menu Items
    menuItems.forEach(item => {
      if (item.name?.toLowerCase().includes(term) || item.description?.toLowerCase().includes(term)) {
        searchResults.push({
          type: 'menu',
          id: item.id,
          title: item.name,
          subtitle: `£${item.sell_price?.toFixed(2) || '0.00'}`,
          url: createPageUrl(`MenuItemView?id=${item.id}`),
          icon: Utensils,
          color: 'green',
        });
      }
    });

    // Search Staff
    users.forEach(user => {
      if (user.full_name?.toLowerCase().includes(term) || user.email?.toLowerCase().includes(term)) {
        searchResults.push({
          type: 'staff',
          id: user.id,
          title: user.full_name,
          subtitle: user.position || 'Staff',
          url: createPageUrl(`StaffProfile?email=${user.email}`),
          icon: Users,
          color: 'blue',
        });
      }
    });

    // Search Documents
    documents.forEach(doc => {
      if (doc.title?.toLowerCase().includes(term) || doc.description?.toLowerCase().includes(term)) {
        searchResults.push({
          type: 'document',
          id: doc.id,
          title: doc.title,
          subtitle: doc.category,
          url: createPageUrl(`DocumentViewer?id=${doc.id}`),
          icon: FileText,
          color: 'indigo',
        });
      }
    });

    // Search Forms
    forms.forEach(form => {
      if (form.form_name?.toLowerCase().includes(term)) {
        searchResults.push({
          type: 'form',
          id: form.id,
          title: form.form_name,
          subtitle: form.category,
          url: createPageUrl(`FormLibrary`),
          icon: ClipboardCheck,
          color: 'amber',
        });
      }
    });

    setResults(searchResults.slice(0, 8)); // Limit to 8 results
    setIsSearching(false);
  }, [searchTerm, sops, menuItems, users, documents, forms]);

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search SOPs, menu, staff, documents..."
          className="pl-10 pr-4 py-6 text-base"
        />
      </div>

      {searchTerm && results.length > 0 && (
        <Card className="absolute top-full mt-2 w-full z-50 shadow-xl">
          <CardContent className="p-2">
            <div className="space-y-1">
              {results.map(result => {
                const Icon = result.icon;
                return (
                  <a
                    key={result.id}
                    href={result.url}
                    onClick={(e) => {
                      if (onResultClick) {
                        e.preventDefault();
                        onResultClick(result);
                      }
                    }}
                    className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <div className={`w-10 h-10 rounded-lg bg-${result.color}-100 flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-5 h-5 text-${result.color}-600`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{result.title}</p>
                      <p className="text-sm text-gray-500 capitalize">{result.subtitle}</p>
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {result.type}
                    </Badge>
                  </a>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {searchTerm && results.length === 0 && !isSearching && (
        <Card className="absolute top-full mt-2 w-full z-50 shadow-xl">
          <CardContent className="p-6 text-center">
            <Search className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500">No results found for "{searchTerm}"</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}