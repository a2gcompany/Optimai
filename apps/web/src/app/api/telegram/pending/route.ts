import { NextResponse } from 'next/server';                                                         
  import { getSupabase } from '@/lib/supabase-client';                                                
                                                                                                      
  export async function GET() {                                                                       
    const supabase = getSupabase();                                                                   
    if (!supabase) return NextResponse.json({ messages: [] });                                        
                                                                                                      
    const { data } = await supabase                                                                   
      .from('telegram_messages')                                                                      
      .select('*')                                                                                    
      .eq('direction', 'inbound')                                                                     
      .eq('processed', false)                                                                         
      .order('created_at', { ascending: true })                                                       
      .limit(5);                                                                                      
                                                                                                      
    return NextResponse.json({ messages: data || [] });                                               
  }                                             
