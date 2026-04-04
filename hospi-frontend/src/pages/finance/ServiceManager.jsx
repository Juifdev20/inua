import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Settings, Plus, Edit, Trash2, Save, X } from 'lucide-react';
import financeApi from '../../services/financeApi/financeApi.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const EMPTY_SERVICE = {
  name: '',
  price: '',
  category: 'ADMISSION'
};

const ServiceManager = () => {
  const { t } = useTranslation();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [services, setServices] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newService, setNewService] = useState(EMPTY_SERVICE);

  /* ---------------------------------- LOAD --------------------------------- */
  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      setLoading(true);
      const data = await financeApi.getServices();
      setServices(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  /* ---------------------------------- EDIT --------------------------------- */
  const handleEdit = (service) => {
    if (editingId) return; // prevent multiple edits
    setEditingId(service.id);
    setEditForm({
      id: service.id,
      name: service.name || '',
      price: service.price ?? '',
      category: service.category || 'ADMISSION'
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm(null);
  };

  const handleSaveEdit = async () => {
    if (!editForm?.name || editForm.price === '') {
      toast.error(t('common.fillAllFields'));
      return;
    }

    try {
      setSaving(true);
      await financeApi.updateService(editingId, {
        name: editForm.name.trim(),
        price: Number(editForm.price),
        category: editForm.category
      });

      toast.success(t('finance.serviceUpdated'));
      handleCancelEdit();
      loadServices();
    } catch (error) {
      console.error(error);
      toast.error(t('finance.updateError'));
    } finally {
      setSaving(false);
    }
  };

  /* --------------------------------- DELETE -------------------------------- */
  const handleDelete = async (id) => {
    if (!window.confirm(t('finance.confirmDelete'))) return;

    try {
      await financeApi.deleteService(id);
      toast.success(t('finance.serviceDeleted'));
      loadServices();
    } catch (error) {
      console.error(error);
      toast.error(t('finance.deleteError'));
    }
  };

  /* ---------------------------------- ADD ---------------------------------- */
  const handleAddService = async () => {
    if (!newService.name || newService.price === '') {
      toast.error(t('common.fillAllFields'));
      return;
    }

    try {
      setSaving(true);
      await financeApi.createService({
        name: newService.name.trim(),
        price: Number(newService.price),
        category: newService.category
      });

      toast.success(t('finance.serviceAdded'));
      setNewService(EMPTY_SERVICE);
      setShowAddForm(false);
      loadServices();
    } catch (error) {
      console.error(error);
      toast.error(t('finance.addError'));
    } finally {
      setSaving(false);
    }
  };

  /* ------------------------------- UTILITIES ------------------------------- */
  const formatCurrency = (amount) =>
    new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0
    }).format(Number(amount) || 0);

  const getCategoryColor = (category) => {
    switch (category) {
      case 'ADMISSION':
        return 'bg-primary/20 text-primary';
      case 'LABO':
        return 'bg-orange-500/20 text-orange-500';
      case 'PHARMACIE':
        return 'bg-cyan-500/20 text-cyan-500';
      default:
        return 'bg-gray-500/20 text-gray-500';
    }
  };

  /* ----------------------------- GROUP & SORT ------------------------------ */
  const groupedServices = useMemo(() => {
    return services.reduce((acc, service) => {
      if (!service?.category) return acc;
      acc[service.category] = acc[service.category] || [];
      acc[service.category].push(service);
      acc[service.category].sort((a, b) =>
        a.name.localeCompare(b.name)
      );
      return acc;
    }, {});
  }, [services]);

  /* ---------------------------------- UI ----------------------------------- */
  return (
    <div className="space-y-6" data-testid="service-manager">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black uppercase italic flex items-center gap-3">
            <Settings className="w-8 h-8 text-primary" />
            {t('finance.services')}
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestion de la grille tarifaire médicale
          </p>
        </div>

        <button
          onClick={() => setShowAddForm((v) => !v)}
          disabled={saving}
          className="px-6 py-3 rounded-[20px] bg-primary text-primary-foreground
                   font-bold flex items-center gap-2 hover:opacity-90 disabled:opacity-50"
        >
          <Plus className="w-5 h-5" />
          Ajouter un service
        </button>
      </div>

      {/* Add Service Form */}
      {showAddForm && (
        <Card className="rounded-[32px] border-2 border-primary">
          <CardHeader>
            <CardTitle className="text-xl font-black uppercase italic">
              Nouveau service
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <input
                placeholder="Nom du service"
                value={newService.name}
                onChange={(e) =>
                  setNewService({ ...newService, name: e.target.value })
                }
                className="input"
              />

              <input
                type="number"
                placeholder="Prix (XAF)"
                value={newService.price}
                onChange={(e) =>
                  setNewService({
                    ...newService,
                    price: e.target.value === '' ? '' : Number(e.target.value)
                  })
                }
                className="input"
              />

              <select
                value={newService.category}
                onChange={(e) =>
                  setNewService({ ...newService, category: e.target.value })
                }
                className="input"
              >
                <option value="ADMISSION">Admission</option>
                <option value="LABO">Laboratoire</option>
                <option value="PHARMACIE">Pharmacie</option>
              </select>
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={() => setShowAddForm(false)} className="btn-outline">
                Annuler
              </button>
              <button onClick={handleAddService} disabled={saving} className="btn-primary">
                Ajouter
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Services */}
      {loading ? (
        <p className="text-center py-12 text-muted-foreground">
          {t('common.loading')}
        </p>
      ) : (
        Object.entries(groupedServices).map(([category, items]) => (
          <Card key={category} className="rounded-[32px]">
            <CardHeader className="border-b">
              <CardTitle className="flex gap-3 items-center">
                <Badge className={getCategoryColor(category)}>{category}</Badge>
                <span>{items.length} services</span>
              </CardTitle>
            </CardHeader>

            <CardContent className="p-0">
              <table className="w-full">
                <tbody>
                  {items.map((service) => (
                    <tr key={service.id} className="border-b">
                      {editingId === service.id ? (
                        <>
                          <td className="p-4">{service.id}</td>
                          <td className="p-4">
                            <input
                              value={editForm.name}
                              onChange={(e) =>
                                setEditForm({ ...editForm, name: e.target.value })
                              }
                              className="input"
                            />
                          </td>
                          <td className="p-4 text-right">
                            <input
                              type="number"
                              value={editForm.price}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  price:
                                    e.target.value === ''
                                      ? ''
                                      : Number(e.target.value)
                                })
                              }
                              className="input w-32 text-right"
                            />
                          </td>
                          <td className="p-4 text-right">
                            <button onClick={handleSaveEdit} disabled={saving}>
                              <Save />
                            </button>
                            <button onClick={handleCancelEdit}>
                              <X />
                            </button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="p-4">{service.id}</td>
                          <td className="p-4">{service.name}</td>
                          <td className="p-4 text-right">
                            {formatCurrency(service.price)}
                          </td>
                          <td className="p-4 text-right">
                            <button onClick={() => handleEdit(service)}>
                              <Edit />
                            </button>
                            <button onClick={() => handleDelete(service.id)}>
                              <Trash2 />
                            </button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};

export default ServiceManager;