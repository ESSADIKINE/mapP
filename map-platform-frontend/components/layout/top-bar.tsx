import React, { useRef } from 'react';
import DropdownMenu from '@radix-ui/react-dropdown-menu';
import Tooltip from '@radix-ui/react-tooltip';
import Avatar from '@radix-ui/react-avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { useStudioStore } from '@/lib/store';
import { Input } from '@/components/ui/input';
import { TextArea } from '@/components/ui/textarea';
import { uploadAsset } from '@/lib/upload';

export const TopBar: React.FC = () => {
  const { project, updateProject } = useStudioStore();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const asset = await uploadAsset(file);
    updateProject({ logoUrl: asset.url });
  };

  return (
    <Card padding="lg" className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_10%_10%,rgba(255,215,0,0.16),transparent_55%)]" />
      <div className="flex flex-col gap-10 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-6">
          <Badge tone="navy" className="max-w-max">Atlas Studio</Badge>
          <div className="max-w-2xl space-y-4">
            <Input
              className="text-3xl font-semibold uppercase tracking-[0.3em] text-white/90"
              value={project.title}
              onChange={(event) => updateProject({ title: event.target.value })}
            />
            <TextArea
              className="min-h-[100px] text-base text-white/80"
              value={project.description ?? ''}
              onChange={(event) => updateProject({ description: event.target.value })}
            />
            <div className="flex flex-wrap items-center gap-3">
              <Tooltip.Provider>
                <Tooltip.Root>
                  <Tooltip.Trigger asChild>
                    <span className="flex items-center gap-2 text-sm text-white/60">
                      <span className="h-2 w-2 rounded-full bg-primary-400 animate-ping" />
                      Live prototype mode
                    </span>
                  </Tooltip.Trigger>
                  <Tooltip.Content side="top" className="translate-y-2">
                    Previewing real-time updates from your workspace.
                  </Tooltip.Content>
                </Tooltip.Root>
              </Tooltip.Provider>
              <Badge tone="gold">High fidelity</Badge>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <Avatar.Root className="h-14 w-14">
              {project.logoUrl ? (
                <Avatar.Image src={project.logoUrl} alt={project.title} />
              ) : (
                <Avatar.Fallback>{project.title.slice(0, 2).toUpperCase()}</Avatar.Fallback>
              )}
            </Avatar.Root>
            <div className="text-sm text-white/70">
              <p className="text-xs uppercase tracking-[0.3em] text-white/40">Project style URL</p>
              <Input
                className="mt-2 w-[280px] text-xs"
                placeholder="https://tiles.your-studio.style.json"
                value={project.styleURL ?? ''}
                onChange={(event) => updateProject({ styleURL: event.target.value })}
              />
              <button
                type="button"
                className="mt-3 text-xs font-semibold uppercase tracking-[0.25em] text-primary-200 transition hover:text-primary-100"
                onClick={() => fileInputRef.current?.click()}
              >
                Update logo
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/svg+xml"
                className="hidden"
                onChange={handleLogoUpload}
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" className="border border-white/10">
              Export blueprint
            </Button>
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <Button>Publish</Button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Content align="end" className="mt-2">
                <DropdownMenu.Item>Preview draft</DropdownMenu.Item>
                <DropdownMenu.Item>Share with stakeholders</DropdownMenu.Item>
                <DropdownMenu.Item>Export JSON snapshot</DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Root>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default TopBar;
