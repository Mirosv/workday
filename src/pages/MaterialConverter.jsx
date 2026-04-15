import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calculator, Ruler, Info } from 'lucide-react';
import { MATERIAL_CATALOG } from '@/lib/services-data';

export default function MaterialConverter() {
  const [material, setMaterial] = useState(MATERIAL_CATALOG[0].name);
  const [depth, setDepth] = useState(2);
  const [mode, setMode] = useState('lxw'); // 'lxw' or 'sqft'
  const [length, setLength] = useState('');
  const [width, setWidth] = useState('');
  const [directSqft, setDirectSqft] = useState('');

  const mat = MATERIAL_CATALOG.find(m => m.name === material) || MATERIAL_CATALOG[0];

  const calc = useMemo(() => {
    const sqft = mode === 'lxw' ? (parseFloat(length) || 0) * (parseFloat(width) || 0) : (parseFloat(directSqft) || 0);
    const cubicFt = sqft * (depth / 12);
    const cubicYd = cubicFt / 27;
    const tons = cubicYd * (mat.density / 0.5); // rough conversion
    const estimatedTons = cubicYd * mat.density * 2; // simplified estimate

    return {
      sqft: sqft.toFixed(2),
      cubicFt: cubicFt.toFixed(2),
      cubicYd: cubicYd.toFixed(2),
      tons: (cubicYd * mat.density * 1.35).toFixed(2),
      extraYd: (cubicYd * 1.1).toFixed(2),
      extraTons: (cubicYd * mat.density * 1.35 * 1.1).toFixed(2),
    };
  }, [length, width, directSqft, depth, mode, mat]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading font-bold text-2xl md:text-3xl flex items-center gap-2">
          <Calculator className="h-7 w-7 text-primary" />
          Material Converter
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Estimate volume and weight for common landscaping materials</p>
      </div>

      <Card>
        <CardContent className="p-5 space-y-5">
          {/* Mode toggle */}
          <Tabs value={mode} onValueChange={setMode}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="lxw">Length × Width</TabsTrigger>
              <TabsTrigger value="sqft">Direct square feet</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Material & depth */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Material</Label>
              <Select value={material} onValueChange={setMaterial}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MATERIAL_CATALOG.map(m => (
                    <SelectItem key={m.name} value={m.name}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Depth (inches)</Label>
              <Input type="number" value={depth} onChange={e => setDepth(parseFloat(e.target.value) || 0)} />
            </div>
          </div>

          {/* Dimensions */}
          {mode === 'lxw' ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Length (ft)</Label>
                <Input type="number" value={length} onChange={e => setLength(e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Width (ft)</Label>
                <Input type="number" value={width} onChange={e => setWidth(e.target.value)} placeholder="0" />
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Square feet</Label>
              <Input type="number" value={directSqft} onChange={e => setDirectSqft(e.target.value)} placeholder="0" />
            </div>
          )}

          <div className="bg-muted/60 rounded-lg p-4 flex items-start gap-2 text-xs text-muted-foreground">
            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>For rock and gravel, tons are estimates. It's smart to order a little extra.</span>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <ResultCard label="Square feet" value={calc.sqft} />
        <ResultCard label="Cubic feet" value={calc.cubicFt} />
        <ResultCard label="Cubic yards" value={calc.cubicYd} />
        <ResultCard label="Estimated tons" value={calc.tons} />
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start gap-2 text-sm">
            <Ruler className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-foreground">Material note</p>
              <p className="text-muted-foreground">{mat.note}</p>
            </div>
          </div>
          <div className="bg-primary/5 rounded-lg p-3 text-sm">
            <p className="font-medium text-primary">Recommended with extra</p>
            <p className="text-muted-foreground text-xs mt-1">
              With 10% extra: <span className="font-semibold text-foreground">{calc.extraYd} yd³</span> | 
              With 10% extra tons: <span className="font-semibold text-foreground">{calc.extraTons} tons</span>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ResultCard({ label, value }) {
  return (
    <Card>
      <CardContent className="p-4 text-center">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-heading font-bold text-xl md:text-2xl text-foreground mt-1">{value}</p>
      </CardContent>
    </Card>
  );
}