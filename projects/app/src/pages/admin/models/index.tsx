import React, { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@agentos/web/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@agentos/web/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@agentos/web/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@agentos/web/components/ui/dialog';
import { Input } from '@agentos/web/components/ui/input';
import { Label } from '@agentos/web/components/ui/label';
import { Checkbox } from '@agentos/web/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@agentos/web/components/ui/select';
import { Badge } from '@agentos/web/components/ui/badge';
import { Plus, Settings, Loader2, Activity, Trash2, Edit } from 'lucide-react';
import { toast } from '@agentos/web/components/ui/sonner';

const MODEL_CAPABILITIES = [
    { value: 'chat', label: 'Chat' },
    { value: 'embedding', label: 'Embedding' },
    { value: 'vision', label: 'Vision' },
    { value: 'image', label: 'Image Gen' },
    { value: 'transcribe', label: 'Audio Transcription' },
    { value: 'tts', label: 'Text to Speech' },
    { value: 'rerank', label: 'Rerank' },
];

type Model = {
    id: string;
    name: string;
    displayName?: string;
    contextWindow?: number;
    capabilities?: string[] | string;
    isActive?: boolean;
};

type Provider = {
    id: string;
    name: string;
    type: string;
    config?: {
        baseUrl?: string;
        apiKey?: string;
    };
    models?: Model[];
};

export default function ModelsPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  
  // Provider Form State
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState('openai');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');

  // Test Connection State
  const [isTestLoading, setIsTestLoading] = useState<string | null>(null);
  const [isConfigTestLoading, setIsConfigTestLoading] = useState(false);

  // Model Dialog State
  const [isModelOpen, setIsModelOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<Model | null>(null);
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
  const [modelFormData, setModelFormData] = useState<{
      name: string;
      displayName: string;
      contextWindow: number;
      capabilities: string[];
  }>({
      name: '',
      displayName: '',
      contextWindow: 4096,
      capabilities: ['chat']
  });

  const fetchProviders = async () => {
    const res = await fetch('/api/admin/models');
    if (res.ok) {
      const data = await res.json();
      setProviders(data);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  const handleEdit = (provider: Provider) => {
      setEditingProvider(provider);
      setName(provider.name);
      setType(provider.type);
      setApiKey(''); // Don't show existing key
      setBaseUrl(provider.config?.baseUrl || '');
      setIsOpen(true);
  };


  const handleDeleteProvider = async (id: string) => {
      if (!confirm('Are you sure you want to delete this provider? All associated models will be deleted.')) return;
      
      const res = await fetch(`/api/admin/models/provider?id=${id}`, {
          method: 'DELETE'
      });
      
      if (res.ok) {
          toast.success('Provider deleted');
          fetchProviders();
      } else {
          toast.error('Failed to delete provider');
      }
  };

  const handleOpenAdd = () => {
      setEditingProvider(null);
      setName('');
      setType('openai');
      setApiKey('');
      setBaseUrl('');
      setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const config: Record<string, string> = {};
    if (apiKey) config.apiKey = apiKey;
    if (baseUrl) config.baseUrl = baseUrl;

    const body: { name: string; type: string; config: Record<string, string>; id?: string } = { name, type, config };
    if (editingProvider) {
        body.id = editingProvider.id;
    }

    const res = await fetch('/api/admin/models/provider', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      setIsOpen(false);
      fetchProviders();
      toast.success(editingProvider ? 'Provider updated' : 'Provider created');
    } else {
        toast.error('Failed to save provider');
    }
  };

  const handleTestConnection = async (providerId: string) => {
      setIsTestLoading(providerId);
      try {
          const res = await fetch('/api/admin/models/test', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ providerId })
          });
          const data = await res.json();
          if (res.ok && data.success) {
              toast.success('Connection Successful', { description: data.message });
          } else {
              toast.error('Connection Failed', { description: data.message || data.error });
          }
      } catch {
          toast.error('Connection Error');
      } finally {
          setIsTestLoading(null);
      }
  };

  const handleTestModel = async (modelId: string) => {
      setIsTestLoading(modelId);
      try {
          const res = await fetch('/api/admin/models/test', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ modelId })
          });
          const data = await res.json();
          if (res.ok && data.success) {
              toast.success('Model Test Successful', { description: data.message });
          } else {
              toast.error('Model Test Failed', { description: data.message || data.error });
          }
      } catch {
          toast.error('Model Test Error');
      } finally {
          setIsTestLoading(null);
      }
  };

  const handleTestConfig = async () => {
      setIsConfigTestLoading(true);
      try {
          const config: Record<string, string> = {};
          if (apiKey) config.apiKey = apiKey;
          if (baseUrl) config.baseUrl = baseUrl;

          const res = await fetch('/api/admin/models/test', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ type, config })
          });
          const data = await res.json();
          if (res.ok && data.success) {
              toast.success('Connection Successful', { description: data.message });
          } else {
              toast.error('Connection Failed', { description: data.message || data.error });
          }
      } catch {
          toast.error('Connection Error');
      } finally {
          setIsConfigTestLoading(false);
      }
  };

  const openAddModel = (providerId: string) => {
      setSelectedProviderId(providerId);
      setEditingModel(null);
      setModelFormData({ name: '', displayName: '', contextWindow: 4096, capabilities: ['chat'] });
      setIsModelOpen(true);
  };

  const openEditModel = (model: Model, providerId: string) => {
      setSelectedProviderId(providerId);
      setEditingModel(model);
      
      let caps: string[] = [];
      if (Array.isArray(model.capabilities)) {
          caps = model.capabilities;
      } else if (typeof model.capabilities === 'string') {
           caps = model.capabilities.split(',').map(s => s.trim()).filter(Boolean);
      }

      setModelFormData({
          name: model.name,
          displayName: model.displayName || '',
          contextWindow: model.contextWindow || 4096,
          capabilities: caps
      });
      setIsModelOpen(true);
  };

  const handleDeleteModel = async (id: string) => {
      if (!confirm('Delete this model?')) return;
      const res = await fetch(`/api/admin/models/model?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
          toast.success('Model deleted');
          fetchProviders();
      } else {
          toast.error('Failed to delete model');
      }
  };

  const handleModelSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      
      const payload = {
          name: modelFormData.name,
          displayName: modelFormData.displayName,
          contextWindow: Number(modelFormData.contextWindow),
          capabilities: modelFormData.capabilities
      };

      let res;
      if (editingModel) {
          res = await fetch('/api/admin/models/model', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: editingModel.id, ...payload })
          });
      } else {
          if (!selectedProviderId) return;
          res = await fetch('/api/admin/models/model', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ providerId: selectedProviderId, ...payload })
          });
      }
      
      if (res.ok) {
          setIsModelOpen(false);
          fetchProviders();
          toast.success(editingModel ? 'Model Updated' : 'Model Added');
      } else {
          toast.error(editingModel ? 'Failed to update model' : 'Failed to add model');
      }
  };

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Model Configuration</h1>
        <Button onClick={handleOpenAdd}><Plus className="w-4 h-4 mr-2" /> Add Provider</Button>
        
        {/* Provider Dialog */}
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingProvider ? 'Edit' : 'Add'} AI Provider</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. My OpenAI" required />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="anthropic">Anthropic</SelectItem>
                    <SelectItem value="siliconflow">SiliconFlow (硅基流动)</SelectItem>
                    <SelectItem value="local">Local (Ollama/vLLM)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>API Key</Label>
                <Input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder={editingProvider ? "(Unchanged)" : "sk-..."} />
              </div>
              <div className="space-y-2">
                <Label>Base URL (Optional)</Label>
                <Input value={baseUrl} onChange={e => setBaseUrl(e.target.value)} placeholder="https://api.openai.com/v1" />
              </div>
              <div className="flex justify-between pt-4">
                <Button type="button" variant="secondary" onClick={handleTestConfig} disabled={isConfigTestLoading || !apiKey}>
                    {isConfigTestLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4 mr-2" />}
                    Test Connection
                </Button>
                <div className="flex gap-2">
                    <Button variant="outline" type="button" onClick={() => setIsOpen(false)}>Cancel</Button>
                    <Button type="submit">Save</Button>
                </div>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Model Dialog */}
        <Dialog open={isModelOpen} onOpenChange={setIsModelOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add Model</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleModelSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label>Model ID</Label>
                        <Input value={modelFormData.name} onChange={e => setModelFormData({...modelFormData, name: e.target.value})} placeholder="e.g. gpt-4" required />
                    </div>
                    <div className="space-y-2">
                        <Label>Display Name</Label>
                        <Input value={modelFormData.displayName} onChange={e => setModelFormData({...modelFormData, displayName: e.target.value})} placeholder="e.g. GPT-4 Turbo" />
                    </div>
                    <div className="space-y-2">
                        <Label>Context Window</Label>
                        <Input type="number" value={modelFormData.contextWindow} onChange={e => setModelFormData({...modelFormData, contextWindow: Number(e.target.value)})} required />
                    </div>
                    <div className="space-y-2">
                        <Label>Capabilities</Label>
                        <div className="grid grid-cols-2 gap-2 border p-4 rounded-md">
                            {MODEL_CAPABILITIES.map((cap) => (
                                <div key={cap.value} className="flex items-center space-x-2">
                                    <Checkbox 
                                        id={`cap-${cap.value}`} 
                                        checked={modelFormData.capabilities.includes(cap.value)}
                                        onCheckedChange={(checked) => {
                                            if (checked) {
                                                setModelFormData({
                                                    ...modelFormData,
                                                    capabilities: [...modelFormData.capabilities, cap.value]
                                                });
                                            } else {
                                                setModelFormData({
                                                    ...modelFormData,
                                                    capabilities: modelFormData.capabilities.filter(c => c !== cap.value)
                                                });
                                            }
                                        }}
                                    />
                                    <Label htmlFor={`cap-${cap.value}`} className="cursor-pointer">{cap.label}</Label>
                                </div>
                            ))}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" type="button" onClick={() => setIsModelOpen(false)}>Cancel</Button>
                        <Button type="submit">{editingModel ? 'Update' : 'Add'} Model</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6">
        {providers.map((provider) => (
          <Card key={provider.id}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                {provider.name}
                <Badge variant="secondary">{provider.type}</Badge>
              </CardTitle>
              <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleTestConnection(provider.id)} disabled={isTestLoading === provider.id}>
                      {isTestLoading === provider.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4 mr-2" />}
                      Test
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(provider)}><Settings className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteProvider(provider.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50"><Trash2 className="w-4 h-4" /></Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Model Name</TableHead>
                    <TableHead>Capabilities</TableHead>
                    <TableHead>Context</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {provider.models?.map((model: Model) => (
                    <TableRow key={model.id}>
                      <TableCell>{model.name}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {Array.isArray(model.capabilities) && model.capabilities.map((cap: string) => (
                            <Badge key={cap} variant="outline" className="text-xs">{cap}</Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>{model.contextWindow}</TableCell>
                      <TableCell>
                         <Badge variant={model.isActive ? 'default' : 'secondary'}>
                            {model.isActive ? 'Active' : 'Inactive'}
                         </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => handleTestModel(model.id)} disabled={isTestLoading === model.id} className="h-8 w-8">
                              {isTestLoading === model.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Activity className="w-3 h-3" />}
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => openEditModel(model, provider.id)} className="h-8 w-8"><Edit className="w-3 h-3" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteModel(model.id)} className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"><Trash2 className="w-3 h-3" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground pt-4">
                            <Button variant="outline" size="sm" onClick={() => openAddModel(provider.id)}>
                                <Plus className="w-3 h-3 mr-1" /> Add Model
                            </Button>
                        </TableCell>
                    </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))}
      </div>
    </AdminLayout>
  );
}
